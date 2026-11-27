import { formatInr, formatInrFull } from '../lib/format'
/** Rupees in lakh/crore with the full value in the tooltip. */
export function Money({ v }: { v: number | null | undefined }) {
  return <span title={formatInrFull(v)}>{formatInr(v)}</span>
}
