import type { ColumnDef } from '@tanstack/react-table'
import { useDataset, filterPlan, planByMonth, planByGroup, planTotals } from '../data'
import type { PlanAgg } from '../data'
import { formatInrFull, formatNum, labelCode, formatMonth } from '../lib/format'
import { planOption, barInrOption } from '../lib/charts'
import { Chart } from '../components/Chart'
import { Panel, PageTitle, Badge } from '../components/Panel'
import { Tile } from '../components/Kpi'
import { Select } from '../components/Select'
import { DataTable } from '../components/DataTable'
import { Money } from '../components/Money'
import { EmptyState } from '../components/States'
import { gate } from '../components/gate'
import { useUrlState } from '../lib/useUrlState'
import { Lock } from 'lucide-react'
import { AsOf } from './ScreenHead'

const inr = (key: keyof PlanAgg, header: string): ColumnDef<PlanAgg, any> => ({ accessorKey: key, header, meta: { numeric: true, min: '8rem' }, cell: (c) => <Money v={c.getValue() as number} /> })
const cols: ColumnDef<PlanAgg, any>[] = [
  { accessorKey: 'key', header: 'Material group', cell: (c) => labelCode(c.getValue() as string), meta: { min: '11rem' } },
  inr('plan', 'Plan (₹)'), inr('po', 'Actual PO (₹)'), inr('gr', 'Actual GR (₹)'), inr('variance', 'Variance (₹)'),
  { accessorKey: 'variancePct', header: 'Variance %', meta: { numeric: true, min: '6rem' }, cell: (c) => (c.getValue() === null ? '—' : `${formatNum(c.getValue() as number, 1)}%`) },
]

export function PlanVsActual() {
  const pv = useDataset('plan_vs_actual'), dims = useDataset('dims')
  const { params, set } = useUrlState()
  const blocked = gate([pv, dims])
  if (blocked) return <><PageTitle title="Plan vs actual" lead="Loading…" />{blocked}</>
  if (pv.status !== 'ready' || dims.status !== 'ready') return null
  const f = { type: params.get('type') || undefined, group: params.get('group') || undefined, shutdown: params.get('shutdown') || undefined }
  const rows = filterPlan(pv.data.rows, f)
  const tot = planTotals(rows), byM = planByMonth(rows), byG = planByGroup(rows)
  return (
    <>
      <PageTitle title="Plan vs actual" lead="Planned spend against actual purchase orders and goods receipts, by month and material group." />
      <div className="mb-6 flex items-start gap-3 rounded-md border border-border bg-info-soft p-4" role="note" data-testid="value-banner">
        <Badge tone="info">₹ value-based</Badge>
        <p className="text-sm">This screen is <strong>value-based (₹)</strong>. The plan-vs-actual source has no quantity fields, so no quantities are shown here. Rupees are in lakh (L) and crore (Cr); hover for the full value.</p>
      </div>
      <div className="mb-6 grid grid-cols-2 items-end gap-3 md:grid-cols-4" role="search" aria-label="Filters">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted">Plant<span className="field flex items-center gap-2 bg-sunken text-muted"><Lock size={14} aria-hidden />{dims.data.plants[0].plantId}</span></label>
        <Select label="Material type" value={f.type} onChange={(v) => set({ type: v })} options={dims.data.materialTypes.map((t) => ({ value: t.code, label: t.code }))} />
        <Select label="Material group" value={f.group} onChange={(v) => set({ group: v })} options={dims.data.materialGroups.map((g) => ({ value: g.code, label: labelCode(g.code) }))} />
        <Select label="Shutdown-driven" value={f.shutdown} onChange={(v) => set({ shutdown: v })} options={[{ value: 'yes', label: 'Shutdown-driven' }, { value: 'no', label: 'Not shutdown-driven' }]} />
      </div>
      {rows.length === 0 ? <EmptyState title="No plan rows match" hint="Clear a filter to see plan and actuals again." /> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="tiles">
            <Tile label="Plan (₹)" value={<Money v={tot.plan} />} sub={`${formatMonth(byM[0].key)} to ${formatMonth(byM[byM.length - 1].key)}`} />
            <Tile label="Actual PO (₹)" value={<Money v={tot.po} />} />
            <Tile label="Actual GR (₹)" value={<Money v={tot.gr} />} />
            <Tile label="Variance (₹)" value={<Money v={tot.variance} />} sub={tot.variancePct === null ? undefined : `${formatNum(tot.variancePct, 1)}% of plan (positive = under plan)`} title={formatInrFull(tot.variance)} />
          </div>
          <div className="grid gap-6">
            <Panel title="Plan vs actual by month (₹)" badge={<Badge tone="info">value-based</Badge>}>
              <Chart label="Plan versus actual PO and GR by month in rupees" option={planOption(byM.map((a) => a.key), byM.map((a) => a.plan), byM.map((a) => a.po), byM.map((a) => a.gr))} />
            </Panel>
            <Panel title="Variance by material group (₹)" badge={<Badge tone="info">value-based</Badge>} subtitle="Variance = plan minus actual PO, as published by the source: positive means under plan, negative means over plan.">
              <Chart label="Variance by material group in rupees" option={barInrOption(byG.map((a) => a.key), byG.map((a) => a.variance), 'Variance (₹)')} />
            </Panel>
            <Panel title="Groups, largest variance first (₹)">
              <DataTable data={byG} columns={cols} initialSort={[{ id: 'variance', desc: true }]} label="Plan versus actual by group" rowKey={(r) => r.key} minWidth="52rem" />
            </Panel>
          </div>
        </>
      )}
      <AsOf basis="value-based (₹), no quantities in the source" />
    </>
  )
}
