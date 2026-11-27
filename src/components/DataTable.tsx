import { useRef, useState } from 'react'
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

interface Props<T> {
  data: T[]
  columns: ColumnDef<T, any>[]
  initialSort: SortingState
  label: string
  rowKey: (r: T) => string
  onRowClick?: (r: T) => void
  selectedKey?: string
  minWidth?: string
}

/** Sortable, virtualised table: only the visible rows are in the DOM. Numeric columns use meta.numeric. */
export function DataTable<T>({ data, columns, initialSort, label, rowKey, onRowClick, selectedKey, minWidth = '48rem' }: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSort)
  const table = useReactTable({ data, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() })
  const rows = table.getRowModel().rows
  const scroller = useRef<HTMLDivElement>(null)
  const v = useVirtualizer({ count: rows.length, getScrollElement: () => scroller.current, estimateSize: () => 44, overscan: 12 })
  const cols = table.getVisibleLeafColumns()
  const grid = { gridTemplateColumns: cols.map((c) => `minmax(${(c.columnDef.meta as any)?.min ?? '6rem'}, ${(c.columnDef.meta as any)?.fr ?? 1}fr)`).join(' ') }
  return (
    <div className="overflow-x-auto rounded-sm border border-border" data-testid="table">
      <div style={{ minWidth }}>
        <div role="row" className="grid border-b border-border bg-sunken" style={grid}>
          {table.getHeaderGroups()[0].headers.map((h) => {
            const numeric = (h.column.columnDef.meta as any)?.numeric
            const dir = h.column.getIsSorted()
            return (
              <button
                key={h.id} type="button" role="columnheader" aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
                onClick={h.column.getToggleSortingHandler()}
                className={`flex min-h-ctl items-center gap-1 px-3 text-xs font-semibold text-muted transition-colors hover:text-fg cursor-pointer ${numeric ? 'justify-end' : 'justify-start'}`}
              >
                {flexRender(h.column.columnDef.header, h.getContext())}
                {dir === 'asc' ? <ArrowUp size={12} aria-hidden /> : dir === 'desc' ? <ArrowDown size={12} aria-hidden /> : <ChevronsUpDown size={12} aria-hidden className="text-subtle" />}
              </button>
            )
          })}
        </div>
        <div ref={scroller} role="table" aria-label={label} aria-rowcount={rows.length} className="relative overflow-y-auto" style={{ maxHeight: 'var(--chart-h)' }}>
          <div style={{ height: v.getTotalSize(), position: 'relative' }}>
            {v.getVirtualItems().map((vi) => {
              const row = rows[vi.index]
              const key = rowKey(row.original)
              return (
                <div
                  key={row.id} role="row" data-testid="row" onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={`absolute left-0 grid w-full items-center border-b border-border text-sm ${onRowClick ? 'cursor-pointer hover:bg-sunken' : ''} ${selectedKey === key ? 'bg-accent-soft' : ''}`}
                  style={{ ...grid, top: 0, height: vi.size, transform: `translateY(${vi.start}px)` }}
                >
                  {row.getVisibleCells().map((c) => (
                    <div key={c.id} role="cell" className={`truncate px-3 ${(c.column.columnDef.meta as any)?.numeric ? 'num' : ''}`}>{flexRender(c.column.columnDef.cell, c.getContext())}</div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="border-t border-border bg-sunken px-3 py-2 text-xs text-muted">{rows.length.toLocaleString('en-IN')} rows · click a column to sort · scroll for more</div>
    </div>
  )
}
