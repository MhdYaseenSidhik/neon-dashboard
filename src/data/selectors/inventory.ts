import type { MaterialRow, SummaryRow, Uom, Dims } from '../types'
import { applyFilters, sortUoms, sumBy, totalsByUom, type Filters } from './common'

export interface GroupQty { group: string; uom: Uom; materials: number; availableQty: number; valueInr: number }

/** Available quantity per material group (each group has exactly one uom). Default sort: availableQty desc. */
export function groupQuantities(rows: SummaryRow[], f: Filters): GroupQty[] {
  const m = new Map<string, GroupQty>()
  for (const r of applyFilters(rows, f)) {
    const g = m.get(r.materialGroup) ?? { group: r.materialGroup, uom: r.uom, materials: 0, availableQty: 0, valueInr: 0 }
    g.materials += r.materials; g.availableQty += r.availableQty; g.valueInr += r.valueInr
    m.set(r.materialGroup, g)
  }
  return [...m.values()].sort((a, b) => b.availableQty - a.availableQty)
}

export interface StatusQty { status: string; uom: Uom; materials: number; availableQty: number }

/** Available quantity per inventory status within ONE unit of measure. */
export function statusQuantities(rows: SummaryRow[], f: Filters, uom: Uom): StatusQty[] {
  const base = applyFilters(rows, { ...f, status: undefined }).filter((r) => r.uom === uom)
  const m = new Map<string, StatusQty>()
  for (const r of base) {
    const s = m.get(r.inventoryStatus) ?? { status: r.inventoryStatus, uom, materials: 0, availableQty: 0 }
    s.materials += r.materials; s.availableQty += r.availableQty
    m.set(r.inventoryStatus, s)
  }
  return [...m.values()].sort((a, b) => b.availableQty - a.availableQty)
}

export function availableByUom(rows: SummaryRow[], f: Filters) {
  return totalsByUom(applyFilters(rows, f), (r) => r.availableQty)
}

export function materialCount(rows: SummaryRow[], f: Filters): number {
  return applyFilters(rows, f).reduce((s, r) => s + r.materials, 0)
}

export function demandByUom(rows: MaterialRow[], f: Filters) {
  return totalsByUom(applyFilters(rows, f), (r) => r.trailing12mDemandQty)
}

export function uomsIn(rows: { uom: Uom }[]): Uom[] {
  return sortUoms(rows.map((r) => r.uom))
}

export function groupUom(dims: Dims, group: string): Uom | undefined {
  return dims.materialGroups.find((g) => g.code === group)?.uom
}

/** Material table rows: filtered, default sort availableQty desc. */
export function filterMaterials(rows: MaterialRow[], f: Filters, uom?: Uom): MaterialRow[] {
  return applyFilters(rows, f).filter((r) => !uom || r.uom === uom).sort((a, b) => b.availableQty - a.availableQty)
}

export function valueByGroup(rows: SummaryRow[], f: Filters) {
  return sumBy(applyFilters(rows, f), (r) => r.materialGroup, (r) => r.valueInr)
}
