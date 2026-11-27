import type { ReactNode } from 'react'

export function Panel({ title, subtitle, actions, children, badge }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; badge?: ReactNode }) {
  return (
    <section className="card flex min-w-0 flex-col gap-4 p-5" aria-label={title}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold">{title}{badge}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}

export function PageTitle({ title, lead }: { title: string; lead: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 max-w-prose text-sm text-muted">{lead}</p>
    </div>
  )
}

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'
const toneCls: Record<Tone, string> = {
  success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info', neutral: 'bg-sunken text-muted',
}
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex max-w-full items-center rounded-full px-2 text-xs font-medium ${toneCls[tone]}`} style={{ minHeight: 'var(--space-5)' }}>{children}</span>
}

export function statusTone(s: string): Tone {
  if (s === 'STOCKOUT' || s === 'CRITICAL_SHORTAGE') return 'danger'
  if (s === 'UNDERSTOCK' || s === 'SLOW_MOVING') return 'warning'
  if (s === 'EXCESS' || s === 'NON_MOVING' || s === 'OBSOLETE') return 'info'
  return 'success'
}
export function priorityTone(p: string): Tone { return p === 'HIGH' ? 'danger' : p === 'MEDIUM' ? 'warning' : 'neutral' }
