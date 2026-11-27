import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { ReactNode } from 'react'

const tone = { good: 'text-success', bad: 'text-danger', neutral: 'text-muted' } as const

export function Tile({ label, value, unit, sub, note, title }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; note?: ReactNode; title?: string }) {
  return (
    <div className="card flex min-w-0 flex-col gap-1 p-4" title={title} data-testid="tile">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2"><span className="num min-w-0 break-words text-2xl font-semibold" style={{ textAlign: 'left' }}>{value}</span>{unit && <span className="text-sm font-medium text-muted">{unit}</span>}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
      {note && <div className="text-xs text-subtle">{note}</div>}
    </div>
  )
}

export function Delta({ text, kind }: { text: string; kind: 'good' | 'bad' | 'neutral' | 'up' | 'down' }) {
  const k = kind === 'up' || kind === 'down' ? 'neutral' : kind
  const Icon = kind === 'down' ? ArrowDownRight : kind === 'neutral' ? Minus : ArrowUpRight
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${tone[k]}`}><Icon size={14} aria-hidden />{text}</span>
}

export function Sparkline({ values, toneKind }: { values: number[]; toneKind: 'good' | 'bad' | 'neutral' }) {
  if (values.length < 2) return null
  const w = 120, h = 32
  const min = Math.min(...values), max = Math.max(...values), r = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / r) * (h - 4)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-8 w-full ${tone[toneKind]}`} preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
