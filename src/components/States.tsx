import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, RotateCw } from 'lucide-react'

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4" data-testid="loading">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-chart-sm" />)}
    </div>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center" data-testid="empty">
      <Inbox size={24} className="text-subtle" aria-hidden />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-prose text-sm text-muted">{hint}</p>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-start gap-3 border-danger p-6" data-testid="error">
      <div className="flex items-center gap-2 text-danger"><AlertTriangle size={20} aria-hidden /><h3 className="text-base font-semibold">Could not load this screen</h3></div>
      <p className="text-sm text-muted">{message}</p>
      {onRetry && <button className="btn" onClick={onRetry}><RotateCw size={16} aria-hidden />Retry</button>}
    </div>
  )
}
