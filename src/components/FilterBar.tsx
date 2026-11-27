import { useDataset } from '../data'
import { useUrlState } from '../lib/useUrlState'
import { labelCode } from '../lib/format'
import { Select } from './Select'
import { Lock, X } from 'lucide-react'

interface Props { show?: ('type' | 'group' | 'crit' | 'status' | 'priority')[] }

/** Material filters kept in the URL. The plant is fixed to the single published plant and cannot be changed. */
export function FilterBar({ show = ['type', 'group', 'crit'] }: Props) {
  const dims = useDataset('dims')
  const { filters, set } = useUrlState()
  if (dims.status !== 'ready') return <div className="skeleton h-ctl mb-4" aria-hidden />
  const d = dims.data
  const any = Object.values(filters).some(Boolean)
  return (
    <div className="mb-6 grid grid-cols-2 items-end gap-3 md:grid-cols-3 lg:grid-cols-6" role="search" aria-label="Filters">
      <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted">
        Plant
        <span className="field flex items-center gap-2 bg-sunken text-muted" aria-label="Plant (fixed)"><Lock size={14} aria-hidden />{d.plants[0].plantId}</span>
      </label>
      {show.includes('type') && <Select label="Material type" value={filters.type} onChange={(v) => set({ type: v })} options={d.materialTypes.map((t) => ({ value: t.code, label: t.code }))} />}
      {show.includes('group') && <Select label="Material group" value={filters.group} onChange={(v) => set({ group: v })} options={d.materialGroups.map((g) => ({ value: g.code, label: `${labelCode(g.code)} (${g.uom})` }))} />}
      {show.includes('crit') && <Select label="Criticality" value={filters.crit} onChange={(v) => set({ crit: v })} options={d.criticality.map((c) => ({ value: c.code, label: labelCode(c.code) }))} />}
      {show.includes('status') && <Select label="Stock status" value={filters.status} onChange={(v) => set({ status: v })} options={d.inventoryStatuses.map((s) => ({ value: s, label: labelCode(s) }))} />}
      {show.includes('priority') && <Select label="Priority" value={filters.priority} onChange={(v) => set({ priority: v })} options={['HIGH', 'MEDIUM', 'LOW'].map((s) => ({ value: s, label: labelCode(s) }))} />}
      {any && <button className="btn" onClick={() => set({ type: undefined, group: undefined, crit: undefined, status: undefined, priority: undefined })}><X size={16} aria-hidden />Clear filters</button>}
    </div>
  )
}
