import type { PlanRow } from '../types'

export interface PlanFilters { type?: string; group?: string; shutdown?: string }

export function filterPlan(rows: PlanRow[], f: PlanFilters): PlanRow[] {
  return rows.filter(
    (r) => (!f.type || r.materialType === f.type) && (!f.group || r.materialGroup === f.group) &&
      (!f.shutdown || String(r.shutdownDriven) === (f.shutdown === 'yes' ? 'true' : 'false')),
  )
}

export interface PlanAgg { key: string; plan: number; po: number; gr: number; variance: number; variancePct: number | null }

function agg(rows: PlanRow[], key: (r: PlanRow) => string): PlanAgg[] {
  const m = new Map<string, PlanAgg>()
  for (const r of rows) {
    const a = m.get(key(r)) ?? { key: key(r), plan: 0, po: 0, gr: 0, variance: 0, variancePct: null }
    a.plan += r.planValueInr; a.po += r.actualPoValueInr; a.gr += r.actualGrValueInr; a.variance += r.varianceInr
    m.set(key(r), a)
  }
  for (const a of m.values()) a.variancePct = a.plan === 0 ? null : (a.variance / a.plan) * 100
  return [...m.values()]
}

export function planByMonth(rows: PlanRow[]): PlanAgg[] { return agg(rows, (r) => r.month).sort((a, b) => a.key.localeCompare(b.key)) }
export function planByGroup(rows: PlanRow[]): PlanAgg[] { return agg(rows, (r) => r.materialGroup).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)) }
export function planTotals(rows: PlanRow[]): PlanAgg { return agg(rows, () => 'all')[0] ?? { key: 'all', plan: 0, po: 0, gr: 0, variance: 0, variancePct: null } }
