import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useDataset, groupQuantities, statusQuantities, filterMaterials, uomsIn, applyFilters } from '../data'
import type { MaterialRow } from '../data'
import { useUrlState } from '../lib/useUrlState'
import { formatNum, formatQty, labelCode } from '../lib/format'
import { barQtyOption } from '../lib/charts'
import { Chart } from '../components/Chart'
import { Panel, PageTitle, Badge, statusTone } from '../components/Panel'
import { FilterBar } from '../components/FilterBar'
import { DataTable } from '../components/DataTable'
import { Money } from '../components/Money'
import { MeasureToggle } from '../components/MeasureToggle'
import { UomPicker, useUom } from '../components/UomPicker'
import { EmptyState } from '../components/States'
import { gate } from '../components/gate'
import { AsOf } from './ScreenHead'

function cols(showInr: boolean): ColumnDef<MaterialRow, any>[] {
  const q = (key: keyof MaterialRow, header: string): ColumnDef<MaterialRow, any> => ({
    accessorKey: key, header: `${header}`, meta: { numeric: true, min: '7rem' },
    cell: (c) => formatQty(c.getValue() as number, c.row.original.uom, 1),
  })
  const base: ColumnDef<MaterialRow, any>[] = [
    { accessorKey: 'materialId', header: 'Material', meta: { min: '7rem' } },
    { accessorKey: 'description', header: 'Description', meta: { min: '12rem', fr: 2 } },
    { accessorKey: 'materialGroup', header: 'Group', cell: (c) => labelCode(c.getValue() as string), meta: { min: '9rem' } },
    { accessorKey: 'inventoryStatus', header: 'Status', cell: (c) => <Badge tone={statusTone(c.getValue() as string)}>{labelCode(c.getValue() as string)}</Badge>, meta: { min: '9rem' } },
    q('availableQty', 'Available'), q('trailing12mDemandQty', 'Demand 12m'), q('safetyStockQty', 'Safety stock'), q('reorderPointQty', 'Reorder pt'), q('maxStockQty', 'Max stock'),
    { accessorKey: 'daysOnHand', header: 'Days on hand', meta: { numeric: true, min: '6rem' }, cell: (c) => formatNum(c.getValue() as number, 0) },
  ]
  if (showInr) base.push({ accessorKey: 'valueInr', header: 'Value', meta: { numeric: true, min: '7rem' }, cell: (c) => <Money v={c.getValue() as number} /> })
  return base
}

export function InventoryHealth() {
  const sum = useDataset('inventory_summary'), mat = useDataset('materials')
  const { filters, measure, set } = useUrlState()
  const rows = sum.status === 'ready' ? sum.data.rows : []
  const uoms = useMemo(() => uomsIn(applyFilters(rows, filters)), [rows, filters])
  const [uom, setUom] = useUom(uoms)
  const blocked = gate([sum, mat])
  if (blocked) return <><PageTitle title="Inventory health" lead="Loading…" />{blocked}</>
  if (sum.status !== 'ready' || mat.status !== 'ready') return null
  const groups = groupQuantities(rows, filters).filter((g) => g.uom === uom)
  const status = statusQuantities(rows, filters, uom)
  const table = filterMaterials(mat.data.rows, filters, uom)
  return (
    <>
      <PageTitle title="Inventory health" lead="Drill from material group to stock status to individual materials. Pick a unit: charts and tables then hold one unit only." />
      <FilterBar show={['type', 'group', 'crit', 'status']} />
      <div className="mb-4 flex flex-wrap items-center gap-3"><UomPicker uoms={uoms} value={uom} onChange={setUom} /><MeasureToggle /></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`Available quantity by material group (${uom})`} subtitle="Click a group chip to filter the table to that group.">
          {groups.length === 0 ? <EmptyState title="No groups in this unit" hint="Choose another unit or clear a filter." /> :
            <>
              <Chart label={`Available quantity by group in ${uom}`} option={barQtyOption(groups.map((g) => g.group), groups.map((g) => g.availableQty), uom, 'Available')} />
              <div className="flex flex-wrap gap-2">{groups.map((g) => (
                <button key={g.group} className={`chip min-h-ctl cursor-pointer transition-colors hover:bg-sunken ${filters.group === g.group ? 'border-accent text-accent' : ''}`} onClick={() => set({ group: filters.group === g.group ? undefined : g.group })} aria-pressed={filters.group === g.group} data-testid="group-chip">
                  {labelCode(g.group)} · {formatQty(g.availableQty, g.uom)}</button>))}</div>
            </>}
        </Panel>
        <Panel title={`Available quantity by stock status (${uom})`} subtitle="Click a status chip to filter the table.">
          {status.length === 0 ? <EmptyState title="No stock rows" hint="Nothing matches this unit and filter." /> :
            <>
              <Chart label={`Available quantity by status in ${uom}`} option={barQtyOption(status.map((s) => s.status), status.map((s) => s.availableQty), uom, 'Available')} />
              <div className="flex flex-wrap gap-2">{status.map((s) => (
                <button key={s.status} className={`chip min-h-ctl cursor-pointer transition-colors hover:bg-sunken ${filters.status === s.status ? 'border-accent text-accent' : ''}`} onClick={() => set({ status: filters.status === s.status ? undefined : s.status })} aria-pressed={filters.status === s.status} data-testid="status-chip">
                  {labelCode(s.status)} · {formatNum(s.materials)} materials</button>))}</div>
            </>}
        </Panel>
      </div>
      <div className="mt-6">
        <Panel title={`Materials in ${uom}`} subtitle={`Sorted by available quantity, highest first. ${measure === 'inr' ? 'Value column shown (₹, lakh/crore; hover for the full value).' : 'Switch to Value (₹) to add the rupee column.'}`}>
          {table.length === 0 ? <EmptyState title="No materials match" hint="Clear the status or group filter." /> :
            <DataTable data={table} columns={cols(measure === 'inr')} initialSort={[{ id: 'availableQty', desc: true }]} label={`Materials in ${uom}`} rowKey={(r) => r.materialId} minWidth="64rem" />}
        </Panel>
      </div>
      <AsOf basis={`quantities in ${uom}`} />
    </>
  )
}
