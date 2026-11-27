import { Segmented } from './Segmented'
import { useUrlState, type Measure } from '../lib/useUrlState'

export function MeasureToggle() {
  const { measure, set } = useUrlState()
  return (
    <Segmented<Measure> label="Measure" value={measure} onChange={(v) => set({ measure: v === 'qty' ? undefined : v })}
      options={[{ value: 'qty', label: 'Quantity' }, { value: 'inr', label: 'Value (₹)' }]} />
  )
}
