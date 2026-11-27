import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useDataset, forecastByUom, forecastTotalsByUom, forecastMonths, topSeries, seriesBand, parseHorizon, HORIZONS, sortUoms } from '../data'
import type { SeriesSummary } from '../data'
import { useUrlState } from '../lib/useUrlState'
import { formatQty, formatMonth, labelCode } from '../lib/format'
import { bandOption, lineOption } from '../lib/charts'
import { Chart } from '../components/Chart'
import { Panel, PageTitle, Badge } from '../components/Panel'
import { Segmented } from '../components/Segmented'
import { UomPicker, useUom } from '../components/UomPicker'
import { UomTotals } from '../components/UomTotals'
import { Tile } from '../components/Kpi'
import { DataTable } from '../components/DataTable'
import { EmptyState } from '../components/States'
import { gate } from '../components/gate'
import { AsOf } from './ScreenHead'

const cols: ColumnDef<SeriesSummary, any>[] = [
  { accessorKey: 'materialId', header: 'Material', meta: { min: '7rem' } },
  { accessorKey: 'materialGroup', header: 'Group', cell: (c) => labelCode(c.getValue() as string), meta: { min: '9rem' } },
  { accessorKey: 'materialType', header: 'Type', meta: { min: '5rem' } },
  { accessorKey: 'total', header: 'Forecast total', meta: { numeric: true, min: '8rem' }, cell: (c) => formatQty(c.getValue() as number, c.row.original.uom, 1) },
  { accessorKey: 'peak', header: 'Peak month', meta: { numeric: true, min: '9rem' }, cell: (c) => `${formatQty(c.getValue() as number, c.row.original.uom, 1)} (${formatMonth(c.row.original.peakMonth)})` },
]

export function Forecast() {
  const fc = useDataset('forecast'), man = useDataset('manifest')
  const { horizon: hRaw, set } = useUrlState()
  const horizon = parseHorizon(hRaw)
  const [pick, setPick] = useState<string | undefined>()
  const uomsAll = useMemo(() => (fc.status === 'ready' ? sortUoms(fc.data.byUomMonth.map((r) => r.uom)) : []), [fc])
  const [uom, setUom] = useUom(uomsAll)
  const blocked = gate([fc, man])
  if (blocked) return <><PageTitle title="Demand forecast" lead="Loading…" />{blocked}</>
  if (fc.status !== 'ready' || man.status !== 'ready') return null
  const f = fc.data, m = man.data.forecast
  if (!f.available) {
    return (
      <>
        <PageTitle title="Demand forecast" lead="Future net consumption quantity for Plant 1." />
        <EmptyState title="No forecast available" hint={f.reason ?? 'The source reports that no forecast is available. See the Backtest screen for how the model performed on held-out months.'} />
        <AsOf basis="forecast" />
      </>
    )
  }
  const series = forecastByUom(f, uom, horizon)
  const months = forecastMonths(f, horizon)
  const top = topSeries(f.rows, horizon, uom)
  const sel = top.find((t) => t.seriesId === pick) ?? top[0]
  const band = sel ? seriesBand(f.rows, sel.seriesId, horizon) : []
  return (
    <>
      <PageTitle title="Demand forecast" lead={`Forecast of monthly net consumption quantity (issues 261 minus reversals 262) for ${formatMonth(f.forecastFrom)} to ${formatMonth(f.forecastTo)}. This is a forecast of future months, shown with its horizon and band.`} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Segmented<string> label="Forecast horizon" value={String(horizon)} onChange={(v) => set({ h: v === '12' ? undefined : v })} options={HORIZONS.map((h) => ({ value: String(h), label: `${h} months` }))} />
        <UomPicker uoms={uomsAll} value={uom} onChange={setUom} />
        <Badge tone="info">Forecast · horizon {horizon} months · {formatMonth(months[0])} to {formatMonth(months[months.length - 1])}</Badge>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="tiles">
        {forecastTotalsByUom(f, horizon).map((t) => <Tile key={t.uom} label={`Forecast total, next ${horizon} months (${t.uom})`} value={Math.round(t.total).toLocaleString('en-IN')} unit={t.uom} />)}
        {m && <Tile label="Model" value={m.bestModel} sub={`${m.preset} preset · ${m.engine} · primary metric ${m.metric.name}`} note={`Experiment ${m.experimentId}`} />}
      </div>
      <div className="grid gap-6">
        <Panel title={`Total forecast by month (${uom}), all ${m?.seriesCount.toLocaleString('en-IN') ?? ''} series`} badge={<Badge tone="info">forecast</Badge>}
          subtitle="The P10–P90 band cannot be summed across series, so the total line has no band. Pick a material below to see its band.">
          {series.length === 0 ? <EmptyState title="No forecast for this unit" hint="Pick another unit." /> :
            <Chart label={`Forecast total by month in ${uom}, ${horizon}-month horizon`} option={lineOption(series.map((r) => r.month), [{ name: `Forecast (${uom})`, data: series.map((r) => r.predicted), dashed: true }], uom)} />}
        </Panel>
        <Panel title={sel ? `Forecast with band — ${sel.materialId} (${sel.uom})` : 'Forecast with band'} badge={<Badge tone="info">forecast · P10–P90</Badge>}
          subtitle="Mean forecast with the 10th to 90th percentile band for one material. Values are not clipped, so a small negative figure means net reversals are expected.">
          {band.length === 0 || !sel ? <EmptyState title="No material selected" hint="Select a row in the table below." /> :
            <Chart label={`Forecast band for ${sel.materialId}`} option={bandOption(band.map((r) => r.month), band.map((r) => r.predicted), band.map((r) => r.lower), band.map((r) => r.upper), sel.uom, { mid: `Forecast mean (${sel.uom})`, band: 'P10–P90 band' })} />}
        </Panel>
        <Panel title={`Top materials by forecast quantity (${uom})`} subtitle={`Top 2,000 series of 5,948 in the file (file-size cap), summed over ${horizon} months within one unit. Click a row to chart its band.`}>
          {top.length === 0 ? <EmptyState title="No materials" hint="Pick another unit." /> :
            <DataTable data={top} columns={cols} initialSort={[{ id: 'total', desc: true }]} label={`Forecast by material in ${uom}`} rowKey={(r) => r.seriesId} onRowClick={(r) => setPick(r.seriesId)} selectedKey={sel?.seriesId} minWidth="44rem" />}
        </Panel>
      </div>
      <div className="mt-6 text-xs text-muted"><UomTotals totals={forecastTotalsByUom(f, horizon)} /></div>
      <AsOf basis={`forecast ${formatMonth(f.forecastFrom)}–${formatMonth(f.forecastTo)}, experiment ${f.experimentId}`} />
    </>
  )
}
