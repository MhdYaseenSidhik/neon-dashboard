import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useDataset, backtestByUom, backtestSeries, backtestTopSeries, sortUoms } from '../data'
import { formatQty, formatNum, formatMonth, labelCode } from '../lib/format'
import { bandOption, lineOption } from '../lib/charts'
import { Chart } from '../components/Chart'
import { Panel, PageTitle, Badge } from '../components/Panel'
import { UomPicker, useUom } from '../components/UomPicker'
import { Tile } from '../components/Kpi'
import { DataTable } from '../components/DataTable'
import { EmptyState } from '../components/States'
import { gate } from '../components/gate'
import { FlaskConical } from 'lucide-react'
import { AsOf } from './ScreenHead'

type Row = ReturnType<typeof backtestTopSeries>[number]
const cols: ColumnDef<Row, any>[] = [
  { accessorKey: 'seriesId', header: 'Series', meta: { min: '12rem' } },
  { accessorKey: 'materialGroup', header: 'Group', cell: (c) => labelCode(c.getValue() as string), meta: { min: '9rem' } },
  { accessorKey: 'actual', header: 'Actual, 12 months', meta: { numeric: true, min: '9rem' }, cell: (c) => formatQty(c.getValue() as number, c.row.original.uom, 1) },
]

export function Backtest() {
  const ho = useDataset('forecast_holdout'), man = useDataset('manifest')
  const [pick, setPick] = useState<string | undefined>()
  const uoms = useMemo(() => (ho.status === 'ready' ? sortUoms(ho.data.byUomMonth.map((r) => r.uom)) : []), [ho])
  const [uom, setUom] = useUom(uoms)
  const blocked = gate([ho, man])
  if (blocked) return <><PageTitle title="Backtest" lead="Loading…" />{blocked}</>
  if (ho.status !== 'ready' || man.status !== 'ready') return null
  const h = ho.data, m = man.data.forecast
  const rows = backtestByUom(h, uom)
  const top = backtestTopSeries(h, uom)
  const sel = top.find((t) => t.seriesId === pick) ?? top[0]
  const ser = sel ? backtestSeries(h, sel.seriesId) : []
  const ratio = m ? m.backtestPredictedTotal / m.backtestActualTotal : null
  const ok = h.error.wape < 1 && ratio !== null && ratio >= 0.5 && ratio <= 2
  return (
    <>
      <PageTitle title="Backtest" lead="How the model did on months it had not seen." />
      <div className="mb-6 flex items-start gap-3 rounded-md border border-border bg-warning-soft p-4" role="note" data-testid="backtest-banner">
        <FlaskConical size={20} className="mt-1 shrink-0 text-warning" aria-hidden />
        <div><div className="text-base font-semibold">This is a backtest, not a forecast</div>
          <p className="text-sm text-muted">Predictions for the held-out months {formatMonth(rows[0]?.month ?? '2025-01')} to {formatMonth(rows[rows.length - 1]?.month ?? '2025-12')}, compared with what actually happened. These months are in the past; nothing here predicts the future.</p></div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="tiles">
        <Tile label="MAE (backtest)" value={formatNum(h.error.mae, 3)} unit="qty / series-month" sub="Mean absolute error per series and month, in each series' own unit" />
        <Tile label="WAPE (backtest)" value={formatNum(h.error.wape * 100, 1)} unit="%" sub="Weighted absolute % error" />
        <Tile label={`${h.metric.name} (model metric)`} value={formatNum(h.metric.value, 3)} sub={`Best model ${m?.bestModel ?? ''}`} />
        {ratio !== null && <Tile label="Predicted ÷ actual (all units)" value={formatNum(ratio, 3)} sub="Mixed-unit size check only" />}
      </div>
      {m && (
        <Panel title="Verdict" badge={ok ? <Badge tone="success">WAPE below 1, total within ½–2×</Badge> : <Badge tone="danger">WAPE ≥ 1 or total outside ½–2×</Badge>} subtitle={m.verdict}>
          <ul className="list-disc pl-5 text-sm text-muted" data-testid="verdict-reasons">{m.verdictReasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </Panel>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3"><UomPicker uoms={uoms} value={uom} onChange={setUom} /><Badge tone="warning">backtest</Badge></div>
      <div className="mt-4 grid gap-6">
        <Panel title={`Backtest: predicted vs actual by month (${uom}), all series`} badge={<Badge tone="warning">backtest · not a forecast</Badge>}>
          {rows.length === 0 ? <EmptyState title="No backtest rows" hint="Pick another unit." /> :
            <Chart label={`Backtest predicted versus actual in ${uom}`} option={lineOption(rows.map((r) => r.month), [{ name: `Actual (${uom})`, data: rows.map((r) => r.actual) }, { name: `Backtest predicted (${uom})`, data: rows.map((r) => r.predicted), dashed: true, colorIdx: 1 }], uom)} />}
        </Panel>
        <Panel title={sel ? `Backtest band — ${sel.seriesId.split('|')[0]} (${sel.uom})` : 'Backtest band'} badge={<Badge tone="warning">backtest · P10–P90</Badge>}>
          {ser.length === 0 || !sel ? <EmptyState title="No series selected" hint="Select a row below." /> :
            <Chart label={`Backtest band for ${sel.seriesId}`} option={bandOption(ser.map((r) => r.month), ser.map((r) => r.predicted), ser.map((r) => r.lower), ser.map((r) => r.upper), sel.uom, { mid: 'Backtest predicted', band: 'P10–P90 band', actual: 'Actual' }, ser.map((r) => r.actual))} />}
        </Panel>
        <Panel title={`Largest series by actual volume (${uom})`} subtitle="Top 2,000 series of 5,948 in the file (file-size cap). Click a row to chart it.">
          {top.length === 0 ? <EmptyState title="No series" hint="Pick another unit." /> :
            <DataTable data={top} columns={cols} initialSort={[{ id: 'actual', desc: true }]} label={`Backtest series in ${uom}`} rowKey={(r) => r.seriesId} onRowClick={(r) => setPick(r.seriesId)} selectedKey={sel?.seriesId} minWidth="36rem" />}
        </Panel>
      </div>
      <AsOf basis={`backtest, experiment ${h.experimentId}`} />
    </>
  )
}
