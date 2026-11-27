import { useState } from 'react'
import { useDataset, kpiSnapshots, deltaTone, hasMaterialFilter } from '../data'
import type { KpiSnapshot } from '../data'
import { useUrlState } from '../lib/useUrlState'
import { formatKpi, formatMonth, formatNum, formatInrFull } from '../lib/format'
import { lineOption } from '../lib/charts'
import { Chart } from '../components/Chart'
import { Panel, PageTitle, Badge } from '../components/Panel'
import { Delta, Sparkline } from '../components/Kpi'
import { FilterBar } from '../components/FilterBar'
import { MeasureToggle } from '../components/MeasureToggle'
import { EmptyState } from '../components/States'
import { gate } from '../components/gate'
import { AsOf } from './ScreenHead'

function Card({ s, selected, onSelect }: { s: KpiSnapshot; selected: boolean; onSelect: () => void }) {
  const tone = deltaTone(s.item.direction, s.delta)
  const mixed = s.item.uom === 'QTY'
  const dir = s.item.direction === 'neutral' ? 'No target direction' : s.item.direction === 'higher_is_better' ? 'Higher is better' : 'Lower is better'
  const pct = s.delta !== null && s.prevValue ? (s.delta / Math.abs(s.prevValue)) * 100 : null
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} data-testid="kpi-card" data-code={s.item.code}
      title={s.item.uom === 'INR' ? formatInrFull(s.value) : s.item.definition}
      className={`card flex min-h-ctl w-full cursor-pointer flex-col gap-2 p-4 text-left transition-colors hover:bg-sunken ${selected ? 'border-accent' : ''}`}>
      <div className="flex items-start justify-between gap-2"><span className="text-sm font-medium text-muted">{s.item.label}</span>{mixed && <Badge tone="warning">mixed units</Badge>}</div>
      <div className="num text-xl font-semibold" style={{ textAlign: 'left' }}>{formatKpi(s.value, s.item.uom)}{mixed && <span className="ml-1 text-sm font-medium text-muted">qty</span>}</div>
      <Sparkline values={s.series.map((x) => x.value)} toneKind={tone} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Delta kind={tone} text={s.delta === null ? 'no prior month' : `${s.delta > 0 ? '+' : ''}${pct === null ? formatNum(s.delta, 2) : formatNum(pct, 1) + '%'} vs prior month`} />
        <span className="text-xs text-subtle">{dir}</span>
      </div>
    </button>
  )
}

export function KpiScorecard() {
  const kp = useDataset('kpis')
  const { filters, measure } = useUrlState()
  const [sel, setSel] = useState('CONSUMPTION_QTY')
  const blocked = gate([kp])
  if (blocked) return <><PageTitle title="KPI scorecard" lead="Loading…" />{blocked}</>
  if (kp.status !== 'ready') return null
  const all = kpiSnapshots(kp.data)
  const shown = all.filter((s) => (measure === 'qty' ? s.item.uom !== 'INR' : true))
  const qty = shown.filter((s) => s.item.uom === 'QTY'), other = shown.filter((s) => s.item.uom !== 'QTY')
  const cur = all.find((s) => s.item.code === sel) ?? all[0]
  return (
    <>
      <PageTitle title="KPI scorecard" lead="Plant 1 KPIs from the source catalog, latest month against the prior month. Colour follows each KPI's direction: green is the good direction, red the bad one, grey means no direction." />
      <FilterBar show={['type', 'group', 'crit']} />
      {hasMaterialFilter(filters) && <p role="note" className="mb-4 rounded-sm bg-info-soft px-3 py-2 text-sm" data-testid="kpi-unfiltered">KPIs are published for the whole plant. They are <strong>not filtered</strong> by the material type, group or criticality filter.</p>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">Quantity KPIs</h2><MeasureToggle /></div>
      <p className="mb-3 text-sm text-muted">The catalog has two quantity codes, both published as mixed-unit sums (EA + SET + L). Use per-group quantities on Inventory health for unit-safe numbers.</p>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{qty.map((s) => <Card key={s.item.code} s={s} selected={cur.item.code === s.item.code} onSelect={() => setSel(s.item.code)} />)}</div>
      <h2 className="mb-3 text-base font-semibold">{measure === 'qty' ? 'Other KPIs (counts, shares, days, ratios)' : 'Other KPIs, including rupee values'}</h2>
      {other.length === 0 ? <EmptyState title="No KPIs to show" hint="The KPI file has no rows for this view." /> :
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{other.map((s) => <Card key={s.item.code} s={s} selected={cur.item.code === s.item.code} onSelect={() => setSel(s.item.code)} />)}</div>}
      <Panel title={`${cur.item.label} — monthly`} subtitle={cur.item.definition} badge={cur.item.uom === 'QTY' ? <Badge tone="warning">mixed units</Badge> : undefined}>
        <Chart label={`${cur.item.label} by month`} option={lineOption(cur.series.map((x) => x.month), [{ name: cur.item.label, data: cur.series.map((x) => x.value) }], cur.item.uom, { yName: cur.item.uom, fmt: (v) => formatKpi(v, cur.item.uom, 2) })} />
        <p className="text-xs text-muted">{cur.series.length} months, {formatMonth(cur.series[0].month)} to {formatMonth(cur.latestMonth)}.</p>
      </Panel>
      <AsOf basis="plant KPIs, SIMULATED_BASELINE scenario" />
    </>
  )
}
