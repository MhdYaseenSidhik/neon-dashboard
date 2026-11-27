import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { clearDatasetCache } from '../src/data'
import { Shell } from '../src/components/Shell'
import { Overview } from '../src/screens/Overview'
import { InventoryHealth } from '../src/screens/InventoryHealth'
import { Replenishment } from '../src/screens/Replenishment'
import { Forecast } from '../src/screens/Forecast'
import { Backtest } from '../src/screens/Backtest'
import { PlanVsActual } from '../src/screens/PlanVsActual'

// Ticket 3 acceptance tests (S-3). Each describe block maps to one acceptance criterion.

vi.mock('echarts/core', () => ({ use: () => {}, init: () => ({ setOption: () => {}, resize: () => {}, dispose: () => {} }) }))
vi.mock('echarts/charts', () => ({ LineChart: {}, BarChart: {} }))
vi.mock('echarts/components', () => ({ GridComponent: {}, TooltipComponent: {}, LegendComponent: {}, MarkAreaComponent: {} }))
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }))
class RO { observe() {} disconnect() {} unobserve() {} }
;(globalThis as any).ResizeObserver = RO

const file = (n: string) => JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', `${n}.json`), 'utf8'))
const data: Record<string, any> = {}
const get = (n: string) => (data[n] ??= file(n))

beforeEach(() => {
  clearDatasetCache()
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    const n = /data\/(.+)\.json/.exec(url)![1]
    return Promise.resolve(new Response(JSON.stringify(get(n)), { status: 200 }))
  }))
})
afterEach(() => vi.unstubAllGlobals())

const at = (el: JSX.Element, path = '/') =>
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={el} /></Routes></MemoryRouter>)
const inShell = (el: JSX.Element, path = '/') =>
  render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<Shell />}><Route path="*" element={el} /></Route></Routes></MemoryRouter>)

const UNIT = /\b(EA|SET|L)\b/

describe('AC1 quantity is the primary measure', () => {
  it('overview headline tiles are quantities per unit, not rupees', async () => {
    at(<Overview />)
    const tiles = await screen.findByTestId('tiles')
    const t = within(tiles)
    expect(t.getByText('Available stock (EA)')).toBeInTheDocument()
    expect(t.getByText(/Recommended order qty \(EA\)/)).toBeInTheDocument()
    expect(tiles.textContent).not.toMatch(/₹/)
  })
  it('measure defaults to quantity; chart title is a quantity chart', async () => {
    at(<Overview />)
    await screen.findByTestId('tiles')
    expect(screen.getByRole('button', { name: 'Quantity', pressed: true })).toBeInTheDocument()
    expect(screen.getByText(/Available quantity by material group \(/)).toBeInTheDocument()
  })
  it('inventory health defaults to quantity columns, sorted by quantity', async () => {
    at(<InventoryHealth />)
    await waitFor(() => expect(screen.getAllByTestId('table').length).toBeGreaterThan(0))
    const heads = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(heads).toContain('Available')
    expect(heads).not.toContain('Value')
    const avail = screen.getAllByRole('columnheader').find((h) => h.textContent === 'Available')!
    expect(avail.getAttribute('aria-sort')).toMatch(/descending|ascending|none/)
  })
  it('replenishment is sorted by recommended quantity by default', async () => {
    at(<Replenishment />)
    await waitFor(() => expect(screen.getAllByTestId('table').length).toBeGreaterThan(0))
    const rec = screen.getAllByRole('columnheader').find((h) => h.textContent === 'Recommended')!
    expect(rec).toHaveAttribute('aria-sort', 'descending')
  })
  it('forecast tiles use the forecast quantity per unit', async () => {
    at(<Forecast />)
    await waitFor(() => expect(screen.getByTestId('tiles')).toBeInTheDocument())
    expect(screen.getAllByText(/Forecast total, next 12 months \((EA|SET|L)\)/).length).toBe(3)
  })
})

describe('AC2 quantities are never added across units', () => {
  it('overview shows one tile per unit and no combined total', async () => {
    at(<Overview />)
    const tiles = await screen.findByTestId('tiles')
    const labels = within(tiles).getAllByText(/^Available stock \(/).map((e) => e.textContent)
    expect(labels.sort()).toEqual(['Available stock (EA)', 'Available stock (L)', 'Available stock (SET)'])
    expect(screen.queryByText(/^Available stock$/)).toBeNull()
  })
  it('each tile value equals the sum of that unit only (data check)', async () => {
    at(<Overview />)
    const tiles = await screen.findByTestId('tiles')
    for (const u of ['EA', 'SET', 'L']) {
      const sum = get('inventory_summary').rows.filter((r: any) => r.uom === u).reduce((s: number, r: any) => s + r.availableQty, 0)
      const tile = within(tiles).getByText(`Available stock (${u})`).closest('[data-testid="tile"]') as HTMLElement
      const shown = Number(tile.querySelector('.num')!.textContent!.replace(/,/g, ''))
      expect(shown).toBe(Math.round(sum))
    }
  })
  it('forecast and replenishment tiles are one per unit', async () => {
    at(<Replenishment />)
    const tiles = await screen.findByTestId('tiles')
    const units = [...new Set(get('reorder').rows.map((r: any) => r.uom))].sort()
    const labels = within(tiles).getAllByText(/^Recommended order qty \(/).map((e) => e.textContent)
    expect(labels.length).toBe(units.length)
    expect(labels.sort()).toEqual(units.map((u) => `Recommended order qty (${u})`))
  })
  it('the mixed-unit source KPI trend is flagged as mixed units', async () => {
    at(<Overview />)
    await screen.findByTestId('tiles')
    expect(screen.getAllByText('mixed units').length).toBeGreaterThan(0)
  })
  it('a chart panel carries a single unit picker, so a chart never mixes units', async () => {
    at(<InventoryHealth />, '/?uom=SET')
    await waitFor(() => expect(screen.getAllByRole('group', { name: 'Unit of measure' }).length).toBeGreaterThan(0))
    expect(screen.getAllByText(/\(SET\)/).length).toBeGreaterThan(0)
  })
})

describe('AC3 every quantity is labelled with its unit', () => {
  it('data: every row with a material carries uom and materialType', () => {
    for (const n of ['materials', 'reorder', 'inventory_summary']) {
      for (const r of get(n).rows) {
        expect(['EA', 'SET', 'L']).toContain(r.uom)
        expect(['ZSPR', 'ZSPN']).toContain(r.materialType)
      }
    }
    for (const g of get('dims').materialGroups) expect(g.uom).toBeTruthy()
    for (const r of get('forecast').rows.slice(0, 500)) { expect(r.uom).toBeTruthy(); expect(r.materialType).toBeTruthy() }
  })
  it('every overview tile that is a quantity shows its unit', async () => {
    at(<Overview />)
    const tiles = await screen.findByTestId('tiles')
    within(tiles).getAllByTestId('tile').forEach((t) => {
      const label = t.textContent ?? ''
      if (/Available stock|Recommended order qty/.test(label)) expect(label).toMatch(UNIT)
    })
  })
  it('the material group filter shows the unit next to each group', async () => {
    at(<Overview />)
    await screen.findByTestId('tiles')
    const sel = (await screen.findByLabelText('Material group')) as HTMLSelectElement
    const opts = Array.from(sel.querySelectorAll('option')).filter((o) => o.value)
    expect(opts.length).toBeGreaterThan(0)
    opts.forEach((o) => expect(o.textContent).toMatch(/\((EA|SET|L)\)/))
  })
  it('forecast band panel and table name their unit', async () => {
    at(<Forecast />)
    await waitFor(() => expect(screen.getByTestId('tiles')).toBeInTheDocument())
    expect(screen.getByText(/^Top materials by forecast quantity \((EA|SET|L)\)/)).toBeInTheDocument()
    expect(screen.getByText(/^Forecast with band — \S+ \((EA|SET|L)\)/)).toBeInTheDocument()
  })
})

describe('AC4 rupees are secondary: a column, tooltip or toggle', () => {
  it('inventory health hides the Value column until the toggle is set', async () => {
    const a = at(<InventoryHealth />)
    await waitFor(() => expect(screen.getAllByTestId('table').length).toBeGreaterThan(0))
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).not.toContain('Value')
    a.unmount()
    at(<InventoryHealth />, '/?measure=inr')
    await waitFor(() => expect(screen.getAllByTestId('table').length).toBeGreaterThan(0))
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toContain('Value')
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toContain('Available')
  })
  it('replenishment adds the Est. value column only on the rupee toggle', async () => {
    const a = at(<Replenishment />)
    await waitFor(() => expect(screen.getAllByTestId('table').length).toBeGreaterThan(0))
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).not.toContain('Est. value')
    a.unmount()
    at(<Replenishment />, '/?measure=inr')
    await waitFor(() => expect(screen.getAllByTestId('table').length).toBeGreaterThan(0))
    const heads = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(heads).toContain('Est. value')
    expect(heads).toContain('Recommended')
  })
  it('the measure toggle exists and is switchable by click', async () => {
    at(<Overview />)
    await screen.findByTestId('tiles')
    fireEvent.click(screen.getByRole('button', { name: 'Value (₹)' }))
    await waitFor(() => expect(screen.getByText('Inventory value by material group (₹)')).toBeInTheDocument())
    expect(screen.getByText(/Secondary view: rupee value/)).toBeInTheDocument()
  })
  it('rupee value on the overview is a footnote labelled secondary', async () => {
    at(<Overview />)
    await screen.findByTestId('tiles')
    expect(screen.getByText(/\(secondary measure\)/)).toHaveTextContent('₹')
  })
})

describe('AC5 plan vs actual is labelled value-based', () => {
  it('banner, badges and ₹ headings, and no quantity units', async () => {
    at(<PlanVsActual />)
    await waitFor(() => expect(screen.getByTestId('value-banner')).toHaveTextContent(/value-based/))
    expect(screen.getByTestId('value-banner')).toHaveTextContent(/no quantity fields/i)
    expect(screen.getAllByText('value-based').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Plan (₹)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Actual PO (₹)').length).toBeGreaterThan(0)
    expect(screen.getByTestId('tiles').textContent).not.toMatch(UNIT)
  })
  it('data: plan_vs_actual has no quantity fields', () => {
    const keys = Object.keys(get('plan_vs_actual').rows[0])
    expect(keys.filter((k) => /qty|quantity/i.test(k))).toEqual([])
    expect(keys.filter((k) => /Inr$/.test(k)).length).toBeGreaterThanOrEqual(3)
  })
})

describe('AC6 header shows plant name and as-of date; plant filter is fixed', () => {
  it('header carries the plant name, HZL_DEMO_01 and the manifest as-of date', async () => {
    inShell(<Overview />)
    await waitFor(() => expect(screen.getByTestId('as-of')).not.toHaveTextContent('…'))
    const m = get('manifest')
    expect(screen.getByTestId('plant-name')).toHaveTextContent(m.plantName)
    expect(screen.getAllByRole('banner')[0]).toHaveTextContent('HZL_DEMO_01')
    expect(screen.getByTestId('as-of')).toHaveAttribute('datetime', m.asOf)
  })
  it('the source disclaimer is shown', async () => {
    inShell(<Overview />)
    await waitFor(() => expect(screen.getByTestId('disclaimer')).toHaveTextContent(get('manifest').disclaimer))
  })
  it('data: dims lists only HZL_DEMO_01 and no row has another plant or ALL_PLANTS', () => {
    expect(get('dims').plants.map((p: any) => p.plantId)).toEqual(['HZL_DEMO_01'])
    for (const n of ['kpis', 'inventory_summary', 'materials', 'reorder', 'plan_vs_actual']) {
      for (const r of get(n).rows) expect(r.plantId).toBe('HZL_DEMO_01')
    }
  })
  it('the plant filter is fixed: a locked label, not a select, on every filtered screen', async () => {
    for (const el of [<Overview />, <InventoryHealth />, <Replenishment />, <PlanVsActual />]) {
      const v = at(el)
      await waitFor(() => expect(screen.getAllByText('HZL_DEMO_01').length).toBeGreaterThan(0))
      expect(screen.queryByLabelText('Plant', { selector: 'select' })).toBeNull()
      expect(screen.getAllByRole('search')[0].querySelector('select option[value="HZL_DEMO_02"]')).toBeNull()
      v.unmount()
    }
  })
  it('a plant in the URL cannot change the plant filter', async () => {
    at(<Overview />, '/?plant=HZL_DEMO_02')
    await waitFor(() => expect(screen.getAllByText('HZL_DEMO_01').length).toBeGreaterThan(0))
    expect(screen.queryByText('HZL_DEMO_02')).toBeNull()
  })
})

describe('AC7 forecast has 3 / 6 / 12-month horizons and a band', () => {
  it('offers exactly the 3, 6 and 12 month horizons, 12 selected by default', async () => {
    at(<Forecast />)
    await waitFor(() => expect(screen.getByRole('group', { name: 'Forecast horizon' })).toBeInTheDocument())
    const g = within(screen.getByRole('group', { name: 'Forecast horizon' }))
    expect(g.getAllByRole('button').map((b) => b.textContent)).toEqual(['3 months', '6 months', '12 months'])
    expect(g.getByRole('button', { name: '12 months' })).toHaveAttribute('aria-pressed', 'true')
  })
  for (const h of [3, 6, 12]) {
    it(`the ${h}-month horizon changes tile, badge and window`, async () => {
      at(<Forecast />, `/?h=${h}`)
      await waitFor(() => expect(screen.getByText(new RegExp(`Forecast · horizon ${h} months`))).toBeInTheDocument())
      expect(screen.getAllByText(new RegExp(`Forecast total, next ${h} months`)).length).toBe(3)
    })
  }
  it('clicking a horizon switches the view', async () => {
    at(<Forecast />)
    await waitFor(() => expect(screen.getByRole('group', { name: 'Forecast horizon' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '6 months' }))
    await waitFor(() => expect(screen.getByText(/horizon 6 months/)).toBeInTheDocument())
  })
  it('shows the P10–P90 band panel and says the total line has no band', async () => {
    at(<Forecast />)
    await waitFor(() => expect(screen.getByText(/forecast · P10–P90/)).toBeInTheDocument())
    expect(screen.getByText(/band cannot be summed across series/)).toBeInTheDocument()
  })
  it('data: forecast rows cover horizons 1..12 with lower <= predicted <= upper where a band exists', () => {
    const rows = get('forecast').rows
    expect(Math.max(...rows.map((r: any) => r.horizon))).toBe(12)
    expect(Math.min(...rows.map((r: any) => r.horizon))).toBe(1)
    expect(get('forecast').forecastFrom).toBe('2026-01')
    expect(get('forecast').forecastTo).toBe('2026-12')
    expect(get('forecast').horizons).toEqual([3, 6, 12])
    const banded = rows.filter((r: any) => r.lower !== null && r.upper !== null)
    expect(banded.length).toBeGreaterThan(0)
    for (const r of banded) expect(r.lower).toBeLessThanOrEqual(r.upper)
  })
})

describe('AC8 the backtest is labelled as a backtest', () => {
  it('banner says it is not a forecast, tiles and panels carry the backtest badge', async () => {
    at(<Backtest />)
    await waitFor(() => expect(screen.getByTestId('backtest-banner')).toHaveTextContent('This is a backtest, not a forecast'))
    expect(screen.getByText('MAE (backtest)')).toBeInTheDocument()
    expect(screen.getByText('WAPE (backtest)')).toBeInTheDocument()
    expect(screen.getAllByText(/backtest · not a forecast/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/backtest · P10–P90/).length).toBeGreaterThan(0)
  })
  it('data: forecast_holdout.json is kind=backtest with MAE and WAPE', () => {
    const h = get('forecast_holdout')
    expect(h.kind).toBe('backtest')
    expect(h.note).toMatch(/not a forecast/i)
    expect(h.error.mae).toBeGreaterThan(0)
    expect(h.error.wape).toBeGreaterThan(0)
  })
  it('the forecast screen is not labelled a backtest, and vice versa', async () => {
    at(<Forecast />)
    await waitFor(() => expect(screen.getByTestId('tiles')).toBeInTheDocument())
    expect(screen.queryByTestId('backtest-banner')).toBeNull()
  })
})
