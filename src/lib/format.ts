const LAKH = 1e5
const CRORE = 1e7

const nf = (max: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: max })

/** INR in lakh / crore, e.g. ₹1.25 Cr. */
export function formatInr(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const a = Math.abs(v), sign = v < 0 ? '−' : ''
  if (a >= CRORE) return `${sign}₹${(a / CRORE).toFixed(2)} Cr`
  if (a >= LAKH) return `${sign}₹${(a / LAKH).toFixed(2)} L`
  return `${sign}₹${nf(0).format(a)}`
}

/** Full rupee value for tooltips. */
export function formatInrFull(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return `₹${nf(2).format(v)}`
}

export function formatNum(v: number | null | undefined, max = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return nf(max).format(v).replace('-', '−')
}

/** Quantity with its unit, e.g. "81,052 EA". */
export function formatQty(v: number | null | undefined, uom: string, max = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return `${formatNum(v, max)} ${uom}`
}

export function formatPct(v: number | null | undefined, max = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return `${formatNum(v, max)}%`
}

export function formatMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function formatDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function labelCode(s: string): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
}

/** KPI value by catalog unit. */
export function formatKpi(v: number, uom: string, max = 1): string {
  switch (uom) {
    case 'INR': return formatInr(v)
    case 'PCT': return formatPct(v, 2)
    case 'DAYS': return `${formatNum(v, 0)} days`
    case 'RATIO': return `${formatNum(v, 2)}×`
    case 'COUNT': return formatNum(v, 0)
    case 'QTY': return formatNum(v, 0)
    default: return formatNum(v, max)
  }
}
