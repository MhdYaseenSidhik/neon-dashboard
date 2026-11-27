import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Filters } from '../data'

export type Measure = 'qty' | 'inr'

/** Filters, measure toggle and horizon live in the URL so views can be shared and reloaded. */
export function useUrlState() {
  const [params, setParams] = useSearchParams()
  const set = useCallback((patch: Record<string, string | undefined>) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k) }
      return next
    }, { replace: true })
  }, [setParams])
  const filters: Filters = useMemo(() => ({
    type: params.get('type') || undefined, group: params.get('group') || undefined,
    crit: params.get('crit') || undefined, status: params.get('status') || undefined, priority: params.get('priority') || undefined,
  }), [params])
  const measure: Measure = params.get('measure') === 'inr' ? 'inr' : 'qty'
  return { params, set, filters, measure, horizon: params.get('h'), uom: params.get('uom') || undefined, sort: params.get('sort') || undefined }
}
