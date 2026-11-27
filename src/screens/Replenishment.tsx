import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useDataset, recommendedByUom, recommendedByGroupPriority, reorderTable, priorityCounts, shutdownDrivenCount, reorderUoms, applyFilters } from '../data'
import type { ReorderRow } from '../data'
import { useUrlState } from '../lib/useUrlState'
import { formatQty, labelCode, formatDate } from '../lib/format'
import { stackedPriorityOption } from '../lib/charts'
import { Chart } from '../components/Chart'
import { Panel, PageTitle, Badge, priorityTone } from '../components/Panel'
import { Tile } from '../components/Kpi'
import { FilterBar } from '../components/FilterBar'
import { DataTable } from '../components/DataTable'
import { Money } from '../components/Money'
import { MeasureToggle } from '../components/MeasureToggle'
import { UomPicker, useUom } from '../components/UomPicker'
import { EmptyState } from '../components/States'
import { gate } from '../components/gate'
import { AsOf } from './ScreenHead'

function cols(showInr: boolean): ColumnDef<ReorderRow, any>[] {
  const q = (key: keyof ReorderRow, header: string): ColumnDef<ReorderRow, any> => ({ accessorKey: key, header, meta: { numeric: true, min: '7rem' }, cell: (c) => formatQty(c.getValue() as number, c.row.original.uom, 1) })
  const c: ColumnDef<ReorderRow, any>[] = [
    { accessorKey: 'materialId', header: 'Material', meta: { min: '7rem' } },
    { accessorKey: 'priority', header: 'Priority', cell: (x) => <Badge tone={priorityTone(x.getValue() as string)}>{labelCode(x.getValue() as string)}</Badge>, meta: { min: '6rem' }, sortingFn: (a, b) => ['HIGH', 'MEDIUM', 'LOW'].indexOf(b.original.priority) - ['HIGH', 'MEDIUM', 'LOW'].indexOf(a.original.priority) },
    { accessorKey: 'materialGroup', header: 'Group', cell: (x) => labelCode(x.getValue() as string), meta: { min: '9rem' } },
    { accessorKey: 'criticality', header: 'Criticality', cell: (x) => labelCode(x.getValue() as string), meta: { min: '7rem' } },
    q('recommendedQty', 'Recommended'), q('availableQty', 'Available'), q('openPrQty', 'Open PR'), q('openPoQty', 'Open PO'), q('reorderPointQty', 'Reorder pt'),
    { accessorKey: 'recommendedPrDate', header: 'PR date', cell: (x) => formatDate(x.getValue() as string), meta: { min: '7rem' } },
    { accessorKey: 'reason', header: 'Reason', meta: { min: '14rem', fr: 2 } },
  ]
  if (showInr) c.splice(5, 0, { accessorKey: 'estimatedValueInr', header: 'Est. value', meta: { numeric: true, min: '7rem' }, cell: (x) => <Money v={x.getValue() as number} /> })
  return c
}

export function Replenishment() {
  const ro = useDataset('reorder')
  const { filters, measure } = useUrlState()
  const rows = ro.status === 'ready' ? ro.data.rows : []
  const uoms = useMemo(() => reorderUoms(applyFilters(rows, { ...filters, priority: undefined })), [rows, filters])
  const [uom, setUom] = useUom(uoms)
  const blocked = gate([ro])
  if (blocked) return <><PageTitle title="Replenishment" lead="Loading…" />{blocked}</>
  if (ro.status !== 'ready') return null
  const tot = recommendedByUom(rows, filters), pri = priorityCounts(rows, filters)
  const byGroup = recommendedByGroupPriority(rows, filters, uom)
  const table = reorderTable(rows, filters, uom)
  const sd = shutdownDrivenCount(rows, filters)
  return (
    <>
      <PageTitle title="Replenishment" lead="Recommended purchase requisitions for Plant 1. Quantities are per unit of measure; priority counts are lines, not quantities." />
      <FilterBar show={['type', 'group', 'crit', 'priority']} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="tiles">
        {tot.map((t) => <Tile key={t.uom} label={`Recommended order qty (${t.uom})`} value={t.total.toLocaleString('en-IN')} unit={t.uom} />)}
        {pri.map((p) => <Tile key={p.priority} label={`${labelCode(p.priority)} priority`} value={p.lines} unit="lines" />)}
        <Tile label="Shutdown-driven" value={sd} unit="lines" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3"><UomPicker uoms={uoms} value={uom} onChange={setUom} /><MeasureToggle /></div>
      <div className="grid gap-6">
        <Panel title={`Recommended quantity by group and priority (${uom})`}>
          {byGroup.length === 0 ? <EmptyState title="No recommendations" hint="No reorder lines match these filters for this unit." /> :
            <Chart label={`Recommended quantity by group and priority in ${uom}`} option={stackedPriorityOption(byGroup.map((g) => g.group), ['HIGH', 'MEDIUM', 'LOW'].map((p) => ({ name: p, data: byGroup.map((g) => (g as any)[p] as number) })), uom)} />}
        </Panel>
        <Panel title={`Reorder recommendations (${uom})`} subtitle={`Sorted by recommended quantity, highest first. ${measure === 'inr' ? 'Estimated value column shown (₹).' : 'Switch to Value (₹) for estimated rupee value.'}`}>
          {table.length === 0 ? <EmptyState title="No lines to show" hint="Clear the priority or group filter." /> :
            <DataTable data={table} columns={cols(measure === 'inr')} initialSort={[{ id: 'recommendedQty', desc: true }]} label={`Reorder recommendations in ${uom}`} rowKey={(r) => r.recommendationId} minWidth="72rem" />}
        </Panel>
      </div>
      <AsOf basis="recommendations dated at the as-of date" />
    </>
  )
}
