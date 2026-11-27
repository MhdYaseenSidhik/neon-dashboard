import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { clearDatasetCache } from '../src/data'
import { Overview } from '../src/screens/Overview'
import { Forecast } from '../src/screens/Forecast'
import { Backtest } from '../src/screens/Backtest'
import { PlanVsActual } from '../src/screens/PlanVsActual'
import { KpiScorecard } from '../src/screens/KpiScorecard'

vi.mock('echarts/core', () => ({ use: () => {}, init: () => ({ setOption: () => {}, resize: () => {}, dispose: () => {} }) }))
vi.mock('echarts/charts', () => ({ LineChart: {}, BarChart: {} }))
vi.mock('echarts/components', () => ({ GridComponent: {}, TooltipComponent: {}, LegendComponent: {}, MarkAreaComponent: {} }))
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }))

class RO { observe() {} disconnect() {} unobserve() {} }
;(globalThis as any).ResizeObserver = RO

const file = (n: string) => JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', `${n}.json`), 'utf8'))
function mockFetch(over: Record<string, () => Response | Promise<Response>> = {}) {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    const n = /data\/(.+)\.json/.exec(url)![1]
    if (over[n]) return Promise.resolve(over[n]())
    return Promise.resolve(new Response(JSON.stringify(file(n)), { status: 200 }))
  }))
}
const at = (el: JSX.Element, path = '/') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={el} /></Routes></MemoryRouter>)

beforeEach(() => { clearDatasetCache(); mockFetch() })
afterEach(() => vi.unstubAllGlobals())

describe('screens', () => {
  it('overview: shows a loading skeleton, then per-unit quantity tiles labelled with units', async () => {
    at(<Overview />)
    expect(screen.getByTestId('loading')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('tiles')).toBeInTheDocument())
    const tiles = within(screen.getByTestId('tiles'))
    expect(tiles.getByText('Available stock (EA)')).toBeInTheDocument()
    expect(tiles.getByText('Available stock (SET)')).toBeInTheDocument()
    expect(tiles.getByText('Available stock (L)')).toBeInTheDocument()
    expect(await screen.findByTestId('screen-footer')).toHaveTextContent('Simulated POC figure')
  })
  it('overview: says the KPI is not filtered when a material filter is set', async () => {
    at(<Overview />, '/?type=ZSPR')
    await waitFor(() => expect(screen.getAllByText(/not filtered/i).length).toBeGreaterThan(0))
  })
  it('overview: shows an inline error with retry when a dataset fails', async () => {
    mockFetch({ kpis: () => new Response('nope', { status: 500 }) })
    at(<Overview />)
    await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
  it('overview: empty state when filters match nothing', async () => {
    at(<Overview />, '/?type=ZSPR&group=NOPE')
    await waitFor(() => expect(screen.getAllByTestId('empty').length).toBeGreaterThan(0))
  })
  it('kpi scorecard: mixed-unit quantity KPIs are flagged', async () => {
    at(<KpiScorecard />)
    await waitFor(() => expect(screen.getAllByTestId('kpi-card').length).toBeGreaterThan(5))
    expect(screen.getAllByText('mixed units').length).toBeGreaterThan(0)
  })
  it('forecast: 12 months by default, horizon from the URL, forecast label', async () => {
    at(<Forecast />, '/?h=3')
    await waitFor(() => expect(screen.getByText(/Forecast · horizon 3 months/)).toBeInTheDocument())
    expect(screen.getAllByText(/Forecast total, next 3 months \((EA|SET|L)\)/).length).toBe(3)
  })
  it('forecast: when available is false shows the reason and no series', async () => {
    const f = { ...file('forecast'), available: false, reason: 'Source says: too little history', byPlantMonth: [], byUomMonth: [], rows: [] }
    mockFetch({ forecast: () => new Response(JSON.stringify(f), { status: 200 }) })
    at(<Forecast />)
    await waitFor(() => expect(screen.getByText('Source says: too little history')).toBeInTheDocument())
    expect(screen.queryByTestId('chart')).toBeNull()
  })
  it('backtest: carries a backtest banner and MAE / WAPE', async () => {
    at(<Backtest />)
    await waitFor(() => expect(screen.getByTestId('backtest-banner')).toHaveTextContent('backtest, not a forecast'))
    expect(screen.getByText('MAE (backtest)')).toBeInTheDocument()
    expect(screen.getByText('20.3')).toBeInTheDocument()
  })
  it('plan vs actual: states it is value-based and shows no quantity units', async () => {
    at(<PlanVsActual />)
    await waitFor(() => expect(screen.getByTestId('value-banner')).toHaveTextContent('value-based'))
    expect(screen.getByTestId('tiles')).not.toHaveTextContent(/\b(EA|SET)\b/)
  })
})
