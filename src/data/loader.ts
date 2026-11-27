import type { DatasetMap, DatasetName } from './types'

const cache = new Map<string, Promise<unknown>>()

export function dataUrl(name: DatasetName): string {
  return `${import.meta.env.BASE_URL}data/${name}.json`
}

/** Fetch one dataset from public/data (read-only input). Results are cached per name; a failed load is not cached. */
export function loadDataset<N extends DatasetName>(name: N, fetcher: typeof fetch = fetch): Promise<DatasetMap[N]> {
  const hit = cache.get(name)
  if (hit) return hit as Promise<DatasetMap[N]>
  const p = fetcher(dataUrl(name)).then(async (res) => {
    if (!res.ok) throw new Error(`Could not load ${name}.json (HTTP ${res.status})`)
    const body = (await res.json()) as DatasetMap[N]
    return body
  })
  p.catch(() => cache.delete(name))
  cache.set(name, p)
  return p
}

export function clearDatasetCache(): void {
  cache.clear()
}
