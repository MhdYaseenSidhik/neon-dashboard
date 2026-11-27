import type { ReactNode } from 'react'
import { ErrorState, Skeleton } from './States'

interface S { status: 'loading' | 'error' | 'ready'; error?: string; reload: () => void }

/** Returns a loading skeleton / inline error when any dataset is not ready, otherwise null. */
export function gate(states: S[]): ReactNode | null {
  const bad = states.find((s) => s.status === 'error')
  if (bad) return <ErrorState message={bad.error ?? 'Unknown error'} onRetry={() => states.forEach((s) => s.reload())} />
  if (states.some((s) => s.status === 'loading')) return <Skeleton />
  return null
}
