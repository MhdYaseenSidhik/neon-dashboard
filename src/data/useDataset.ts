import { useCallback, useEffect, useState } from 'react'
import { loadDataset, clearDatasetCache } from './loader'
import type { DatasetMap, DatasetName } from './types'

export type DatasetState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T }

export function useDataset<N extends DatasetName>(name: N): DatasetState<DatasetMap[N]> & { reload: () => void } {
  const [state, setState] = useState<DatasetState<DatasetMap[N]>>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    loadDataset(name).then(
      (data) => live && setState({ status: 'ready', data }),
      (e: unknown) => live && setState({ status: 'error', error: e instanceof Error ? e.message : String(e) }),
    )
    return () => { live = false }
  }, [name, nonce])
  const reload = useCallback(() => { clearDatasetCache(); setNonce((n) => n + 1) }, [])
  return { ...state, reload }
}
