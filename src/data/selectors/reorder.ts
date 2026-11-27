import type { ReorderRow, Uom } from '../types'
import { applyFilters, sortUoms, totalsByUom, type Filters } from './common'

export const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const

export function priorityCounts(rows: ReorderRow[], f: Filters) {
  const base = applyFilters(rows, { ...f, priority: undefined })
  return PRIORITIES.map((p) => ({ priority: p, lines: base.filter((r) => r.priority === p).length }))
}

export function recommendedByUom(rows: ReorderRow[], f: Filters) {
  return totalsByUom(applyFilters(rows, f), (r) => r.recommendedQty)
}

/** Recommended quantity per material group and priority, within ONE uom. */
export function recommendedByGroupPriority(rows: ReorderRow[], f: Filters, uom: Uom) {
  const base = applyFilters(rows, f).filter((r) => r.uom === uom)
  const groups = [...new Set(base.map((r) => r.materialGroup))]
  const rowsOut = groups.map((g) => {
    const rs = base.filter((r) => r.materialGroup === g)
    const by = Object.fromEntries(PRIORITIES.map((p) => [p, rs.filter((r) => r.priority === p).reduce((s, r) => s + r.recommendedQty, 0)])) as Record<string, number>
    return { group: g, total: rs.reduce((s, r) => s + r.recommendedQty, 0), ...by }
  })
  return rowsOut.sort((a, b) => b.total - a.total)
}

/** Table rows: default sort recommendedQty desc. */
export function reorderTable(rows: ReorderRow[], f: Filters, uom?: Uom): ReorderRow[] {
  return applyFilters(rows, f).filter((r) => !uom || r.uom === uom).sort((a, b) => b.recommendedQty - a.recommendedQty)
}

export function reorderUoms(rows: ReorderRow[]): Uom[] { return sortUoms(rows.map((r) => r.uom)) }
export function shutdownDrivenCount(rows: ReorderRow[], f: Filters): number {
  return applyFilters(rows, f).filter((r) => r.shutdownId).length
}
