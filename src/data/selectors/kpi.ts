import type { KpiCatalogItem, KpiRow, KpisFile, Direction } from '../types'

export interface KpiSnapshot {
  item: KpiCatalogItem; latestMonth: string; value: number; prevValue: number | null; delta: number | null
  series: { month: string; value: number }[]
}

export function kpiSeries(rows: KpiRow[], code: string): { month: string; value: number }[] {
  return rows.filter((r) => r.kpiCode === code).sort((a, b) => a.month.localeCompare(b.month)).map((r) => ({ month: r.month, value: r.value }))
}

/** Latest month, previous month and series for every catalog code present in the plant rows (HZL_DEMO_01 only). */
export function kpiSnapshots(file: KpisFile): KpiSnapshot[] {
  const out: KpiSnapshot[] = []
  for (const item of file.catalog) {
    const series = kpiSeries(file.rows, item.code)
    if (!series.length) continue
    const last = series[series.length - 1]
    const prev = series.length > 1 ? series[series.length - 2].value : null
    out.push({ item, latestMonth: last.month, value: last.value, prevValue: prev, delta: prev === null ? null : last.value - prev, series })
  }
  return out
}

export type Tone = 'good' | 'bad' | 'neutral'

/** Colour a change by catalog.direction. Neutral KPIs are never good/bad. */
export function deltaTone(direction: Direction, delta: number | null): Tone {
  if (delta === null || delta === 0 || direction === 'neutral') return 'neutral'
  const up = delta > 0
  return (direction === 'higher_is_better') === up ? 'good' : 'bad'
}

export const QTY_CODES = ['CONSUMPTION_QTY', 'GROSS_INVENTORY_QTY'] as const
export function isQtyKpi(item: KpiCatalogItem): boolean { return item.uom === 'QTY' }
export function isInrKpi(item: KpiCatalogItem): boolean { return item.uom === 'INR' }
