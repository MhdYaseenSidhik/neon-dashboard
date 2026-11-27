import { formatQty } from '../lib/format'
import type { Uom } from '../data'

/** One chip per unit of measure: totals are never merged across units. */
export function UomTotals({ totals, digits = 0 }: { totals: { uom: Uom; total: number }[]; digits?: number }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Totals per unit of measure">
      {totals.map((t) => <li key={t.uom} className="chip" data-testid="uom-total">{formatQty(t.total, t.uom, digits)}</li>)}
    </ul>
  )
}
