import { useDataset } from '../data'
import { formatDate } from '../lib/format'

/** Per-screen as-of line + disclaimer (the header carries it too; this keeps it adjacent to the figures). */
export function AsOf({ basis }: { basis?: string }) {
  const m = useDataset('manifest')
  if (m.status !== 'ready') return null
  return (
    <p className="mt-6 text-xs text-subtle" data-testid="screen-footer">
      As of {formatDate(m.data.asOf)}{basis ? ` · ${basis}` : ''} · {m.data.disclaimer}
    </p>
  )
}
