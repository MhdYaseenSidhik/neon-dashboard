import { Segmented } from './Segmented'
import { useUrlState } from '../lib/useUrlState'
import type { Uom } from '../data'

/** Chooses which unit of measure a chart shows, so a chart never mixes units. State lives in the URL (?uom=). */
export function useUom(available: Uom[]): [Uom, (u: Uom) => void] {
  const { uom, set } = useUrlState()
  const cur = uom && available.includes(uom) ? uom : available[0]
  return [cur, (u) => set({ uom: u })]
}

export function UomPicker({ uoms, value, onChange }: { uoms: Uom[]; value: Uom; onChange: (u: Uom) => void }) {
  return <Segmented<string> label="Unit of measure" value={value} onChange={onChange} options={uoms.map((u) => ({ value: u, label: u }))} />
}
