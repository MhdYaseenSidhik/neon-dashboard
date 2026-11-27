import { useMemo } from 'react'
import { useDataset, groupQuantities, statusQuantities, availableByUom, materialCount, hasMaterialFilter, kpiSnapshots, recommendedByUom, priorityCounts, uomsIn, sumBy, applyFilters } from '../data'
import { useUrlState } from '../lib/useUrlState'
import { formatNum, formatQty, formatInr, formatKpi, labelCode, formatMonth } from '../lib/format'
import { barQtyOption, barInrOption, lineOption } from '../lib/charts'
import { Chart } from '../components/Chart'
import { Panel, PageTitle, Badge } from '../components/Panel'
import { Tile } from '../components/Kpi'
import { FilterBar } from '../components/FilterBar'
import { MeasureToggle } from '../components/MeasureToggle'
import { UomPicker, useUom } from '../components/UomPicker'
import { EmptyState } from '../components/States'
import { gate } from '../components/gate'
import { AsOf } from './ScreenHead'

export function Overview() {
  const sum = useDataset('inventory_summary'), kp = useDataset('kpis'), ro = useDataset('reorder')
  const { filters, measure } = useUrlState()
  const rows = sum.status === 'ready' ? sum.data.rows : []
  const filt = useMemo(() => applyFilters(rows, filters), [rows, filters])
  const uoms = useMemo(() => uomsIn(filt), [filt])
  const [uom, setUom] = useUom(uoms)
  const blocked = gate([sum, kp, ro])
  if (blocked) return <><PageTitle title="Overview" lead="Loading…" />{blocked}</>
  if (sum.status !== 'ready' || kp.status !== 'ready' || ro.status !== 'ready') return null
  const totals = availableByUom(rows, filters)
  const snaps = kpiSnapshots(kp.data)
  const get = (c: string) => snaps.find((s) => s.item.code === c)
  const gq = groupQuantities(rows, filters).filter((g) => g.uom === uom)
  const sq = statusQuantities(rows, filters, uom)
  const valG = [...sumBy(filt, (r) => r.materialGroup, (r) => r.valueInr).entries()].sort((a, b) => b[1] - a[1])
  const rec = recommendedByUom(ro.data.rows, filters)
  const pri = priorityCounts(ro.data.rows, filters)
  const stockout = get('STOCKOUT_LINES'), avail = get('CRITICAL_SPARE_AVAILABILITY_PCT'), doh = get('DAYS_ON_HAND')
  const cons = get('CONSUMPTION_QTY'), gross = get('GROSS_INVENTORY_QTY')
  const filtered = hasMaterialFilter(filters)
  const kpiNote = filtered ? 'Plant KPI — not filtered by the material type, group or criticality filter.' : undefined
  const trend = cons && gross ? lineOption(cons.series.map((s) => s.month), [
    { name: 'Consumption (mixed units)', data: cons.series.map((s) => s.value) },
    { name: 'Gross inventory (mixed units)', data: gross.series.map((s) => s.value), colorIdx: 1 },
  ], 'qty, mixed units', { yName: 'qty (mixed units)', fmt: (v) => `${formatNum(v, 0)} (mixed units)` }) : null
  return (
    <>
      <PageTitle title="Overview" lead="Stock on hand, replenishment load and plant KPIs for Plant 1. Quantities are in each material group's own unit; units are never added together." />
      <FilterBar />
      <h2 className="sr-only">Headline quantities</h2>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="tiles">
        {totals.map((t) => <Tile key={t.uom} label={`Available stock (${t.uom})`} value={formatNum(t.total, 0)} unit={t.uom} sub={`${formatNum(materialCount(rows.filter((r) => r.uom === t.uom), filters))} materials`} />)}
        {totals.length === 0 && <div className="col-span-full"><EmptyState title="No materials match these filters" hint="Clear a filter to see stock again." /></div>}
        {rec.map((t) => <Tile key={`r${t.uom}`} label={`Recommended order qty (${t.uom})`} value={formatNum(t.total, 0)} unit={t.uom} sub={`${pri.map((p) => `${p.lines} ${p.priority.toLowerCase()}`).join(' · ')} priority lines`} />)}
        {stockout && <Tile label="Stockout lines (plant KPI)" value={formatNum(stockout.value, 0)} unit="lines" sub={formatMonth(stockout.latestMonth)} note={kpiNote} />}
        {avail && <Tile label="Critical spare availability" value={formatKpi(avail.value, 'PCT')} sub={formatMonth(avail.latestMonth)} note={kpiNote} />}
        {doh && <Tile label="Days on hand (plant KPI)" value={formatNum(doh.value, 0)} unit="days" sub={formatMonth(doh.latestMonth)} note={kpiNote} />}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={measure === 'qty' ? `Available quantity by material group (${uom})` : 'Inventory value by material group (₹)'} subtitle={measure === 'qty' ? `Only groups counted in ${uom}.` : 'Secondary view: rupee value.'}
          actions={<div className="flex flex-wrap gap-2"><MeasureToggle />{measure === 'qty' && uoms.length > 1 && <UomPicker uoms={uoms} value={uom} onChange={setUom} />}</div>}>
          {(measure === 'qty' ? gq.length : valG.length) === 0 ? <EmptyState title="Nothing to chart" hint={`No groups are counted in ${uom} for these filters.`} /> :
            <Chart label={measure === 'qty' ? `Available quantity by group in ${uom}` : 'Value by group in rupees'}
              option={measure === 'qty' ? barQtyOption(gq.map((g) => g.group), gq.map((g) => g.availableQty), uom, 'Available') : barInrOption(valG.map((g) => g[0]), valG.map((g) => g[1]), 'Value (₹)')} />}
        </Panel>
        <Panel title={`Available quantity by stock status (${uom})`} subtitle={`Same unit only: ${uom}.`}>
          {sq.length === 0 ? <EmptyState title="Nothing to chart" hint="No stock rows for this unit and filter." /> :
            <>
              <Chart label={`Available quantity by stock status in ${uom}`} option={barQtyOption(sq.map((s) => s.status), sq.map((s) => s.availableQty), uom, 'Available')} />
              <ul className="flex flex-wrap gap-2">{sq.slice(0, 4).map((s) => <li key={s.status}><Badge tone="neutral">{labelCode(s.status)}: {formatQty(s.availableQty, uom)}</Badge></li>)}</ul>
            </>}
        </Panel>
      </div>
      {trend && (
        <div className="mt-6">
          <Panel title="Monthly consumption and gross inventory — trend shape" badge={<Badge tone="warning">mixed units</Badge>}
            subtitle="Source KPI quantities (CONSUMPTION_QTY, GROSS_INVENTORY_QTY) add EA, SET and L together, so read the shape, not the level. Plant KPI, not filtered by material filters.">
            <Chart label="Monthly consumption and gross inventory, mixed units" option={trend} />
          </Panel>
        </div>
      )}
      <p className="mt-4 text-xs text-subtle">Rupee view of total stock: {formatInr(filt.reduce((s, r) => s + r.valueInr, 0))} (secondary measure).</p>
      <AsOf basis="quantity view" />
    </>
  )
}
