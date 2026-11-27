import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { DatasetMap, DatasetName } from '../src/data'
import { applyFilters, deltaTone, forecastByUom, forecastTotalsByUom, groupQuantities, kpiSnapshots, parseHorizon, planByMonth, planTotals, filterPlan, recommendedByUom, totalsByUom, topSeries, reorderTable, filterMaterials, availableByUom } from '../src/data'
import { formatInr, formatInrFull, formatQty } from '../src/lib/format'

const load = <N extends DatasetName>(n: N): DatasetMap[N] => JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', `${n}.json`), 'utf8'))

describe('data contract', () => {
  it('every published file is HZL_DEMO_01 only, with no ALL_PLANTS rows', () => {
    expect(load('kpis').rows.every((r) => r.plantId === 'HZL_DEMO_01')).toBe(true)
    expect(load('dims').plants.map((p) => p.plantId)).toEqual(['HZL_DEMO_01'])
    expect(load('materials').rows.every((r) => r.plantId === 'HZL_DEMO_01')).toBe(true)
  })
  it('every material, reorder and forecast row carries materialType and uom', () => {
    for (const rows of [load('materials').rows, load('reorder').rows, load('forecast').rows, load('inventory_summary').rows]) {
      expect(rows.every((r) => r.uom && ['ZSPR', 'ZSPN'].includes(r.materialType))).toBe(true)
    }
    expect(load('dims').materialGroups.every((g) => !!g.uom)).toBe(true)
  })
})

describe('quantity selectors never mix units', () => {
  const sum = load('inventory_summary').rows
  it('per-uom available totals equal the file sums per uom', () => {
    const t = availableByUom(sum, {})
    for (const { uom, total } of t) {
      const expected = sum.filter((r) => r.uom === uom).reduce((s, r) => s + r.availableQty, 0)
      expect(total).toBeCloseTo(expected, 6)
    }
    expect(t.map((x) => x.uom).sort()).toEqual(['EA', 'L', 'SET'])
  })
  it('each material group has exactly one uom, matching dims', () => {
    const dims = load('dims')
    for (const g of groupQuantities(sum, {})) expect(dims.materialGroups.find((d) => d.code === g.group)?.uom).toBe(g.uom)
  })
  it('default sort is quantity descending', () => {
    const g = groupQuantities(sum, {}).map((x) => x.availableQty)
    expect(g).toEqual([...g].sort((a, b) => b - a))
    const m = filterMaterials(load('materials').rows, {}, 'EA').map((x) => x.availableQty)
    expect(m.slice(0, 50)).toEqual([...m].sort((a, b) => b - a).slice(0, 50))
    const r = reorderTable(load('reorder').rows, {}).map((x) => x.recommendedQty)
    expect(r).toEqual([...r].sort((a, b) => b - a))
  })
  it('filters apply to materials', () => {
    expect(applyFilters(load('materials').rows, { type: 'ZSPR' }).every((r) => r.materialType === 'ZSPR')).toBe(true)
  })
  it('recommended totals are per uom', () => {
    const rows = load('reorder').rows
    for (const { uom, total } of recommendedByUom(rows, {})) expect(total).toBeCloseTo(rows.filter((r) => r.uom === uom).reduce((s, r) => s + r.recommendedQty, 0), 6)
  })
  it('totalsByUom keeps units apart', () => {
    expect(totalsByUom([{ uom: 'EA', v: 1 }, { uom: 'L', v: 2 }, { uom: 'EA', v: 3 }], (r) => r.v)).toEqual([{ uom: 'EA', total: 4 }, { uom: 'L', total: 2 }])
  })
})

describe('kpis', () => {
  const k = load('kpis')
  it('colours deltas by catalog direction', () => {
    expect(deltaTone('higher_is_better', 1)).toBe('good')
    expect(deltaTone('higher_is_better', -1)).toBe('bad')
    expect(deltaTone('lower_is_better', 1)).toBe('bad')
    expect(deltaTone('lower_is_better', -1)).toBe('good')
    expect(deltaTone('neutral', 5)).toBe('neutral')
    expect(deltaTone('lower_is_better', null)).toBe('neutral')
  })
  it('snapshots use the latest month of the plant rows', () => {
    const s = kpiSnapshots(k)
    const c = s.find((x) => x.item.code === 'CONSUMPTION_QTY')!
    expect(c.latestMonth).toBe('2025-12')
    expect(c.value).toBe(k.rows.find((r) => r.kpiCode === 'CONSUMPTION_QTY' && r.month === '2025-12')!.value)
  })
})

describe('forecast', () => {
  const f = load('forecast')
  it('parses horizons, defaulting to 12', () => {
    expect(parseHorizon('3')).toBe(3); expect(parseHorizon('6')).toBe(6); expect(parseHorizon('12')).toBe(12)
    expect(parseHorizon('7')).toBe(12); expect(parseHorizon(null)).toBe(12)
  })
  it('3/6/12-month views return 3/6/12 months per unit', () => {
    for (const h of [3, 6, 12]) expect(forecastByUom(f, 'EA', h)).toHaveLength(h)
  })
  it('horizon totals are per unit and grow with the horizon', () => {
    const a = forecastTotalsByUom(f, 3), b = forecastTotalsByUom(f, 12)
    expect(a.map((x) => x.uom)).toEqual(b.map((x) => x.uom))
    const ea3 = a.find((x) => x.uom === 'EA')!.total, ea12 = b.find((x) => x.uom === 'EA')!.total
    expect(ea12).toBeGreaterThan(ea3)
  })
  it('top series are single-unit and sorted desc', () => {
    const t = topSeries(f.rows, 12, 'EA')
    expect(t.every((x) => x.uom === 'EA')).toBe(true)
    expect(t.map((x) => x.total)).toEqual([...t.map((x) => x.total)].sort((a, b) => b - a))
  })
  it('is a forecast (not backtest) covering 2026-01..2026-12', () => {
    expect(f.kind).toBe('forecast'); expect(f.forecastFrom).toBe('2026-01'); expect(f.forecastTo).toBe('2026-12')
  })
  it('the holdout is labelled a backtest', () => { expect(load('forecast_holdout').kind).toBe('backtest') })
})

describe('plan vs actual and formatting', () => {
  it('totals the plan rows in rupees', () => {
    const rows = load('plan_vs_actual').rows
    expect(planTotals(rows).plan).toBeCloseTo(rows.reduce((s, r) => s + r.planValueInr, 0), 4)
    expect(planByMonth(filterPlan(rows, {}))).toHaveLength(24)
  })
  it('formats rupees in lakh and crore with a full tooltip value', () => {
    expect(formatInr(12500000)).toBe('₹1.25 Cr'); expect(formatInr(250000)).toBe('₹2.50 L'); expect(formatInr(900)).toBe('₹900')
    expect(formatInrFull(12500000)).toBe('₹1,25,00,000')
  })
  it('labels every quantity with its unit', () => { expect(formatQty(81052, 'EA')).toBe('81,052 EA') })
})
