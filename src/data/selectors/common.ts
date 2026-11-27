import type { Uom } from '../types'

export interface Filters { type?: string; group?: string; crit?: string; status?: string; priority?: string }

interface Filterable { materialType: string; materialGroup: string; criticality?: string; inventoryStatus?: string; priority?: string }

export function applyFilters<T extends Filterable>(rows: T[], f: Filters): T[] {
  return rows.filter(
    (r) =>
      (!f.type || r.materialType === f.type) &&
      (!f.group || r.materialGroup === f.group) &&
      (!f.crit || r.criticality === f.crit) &&
      (!f.status || r.inventoryStatus === f.status) &&
      (!f.priority || r.priority === f.priority),
  )
}

export function hasMaterialFilter(f: Filters): boolean {
  return Boolean(f.type || f.group || f.crit)
}

/** Sum a numeric field per key. Keys are chosen by the caller; never pass a key that mixes units. */
export function sumBy<T>(rows: T[], key: (r: T) => string, val: (r: T) => number): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + (val(r) || 0))
  return m
}

export const UOM_ORDER: Uom[] = ['EA', 'SET', 'L']

export function sortUoms(uoms: Iterable<Uom>): Uom[] {
  return [...new Set(uoms)].sort((a, b) => {
    const ia = UOM_ORDER.indexOf(a), ib = UOM_ORDER.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b)
  })
}

/** Unit-safe quantity totals: one entry per uom, never a cross-unit sum. */
export function totalsByUom<T extends { uom: Uom }>(rows: T[], val: (r: T) => number): { uom: Uom; total: number }[] {
  const m = sumBy(rows, (r) => r.uom, val)
  return sortUoms(m.keys()).map((uom) => ({ uom, total: m.get(uom) ?? 0 }))
}
