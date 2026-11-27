import type { BacktestSeriesRow, ForecastFile, ForecastRow, HoldoutFile, Uom } from '../types'
import { sortUoms } from './common'

export const HORIZONS = [3, 6, 12] as const
export type Horizon = (typeof HORIZONS)[number]

export function parseHorizon(v: string | null | undefined): Horizon {
  const n = Number(v)
  return (HORIZONS as readonly number[]).includes(n) ? (n as Horizon) : 12
}

/** Unit-safe monthly forecast totals for one uom (all series), up to the horizon. */
export function forecastByUom(file: ForecastFile, uom: Uom, horizon: number) {
  return file.byUomMonth.filter((r) => r.uom === uom && (r.horizon ?? 0) <= horizon).sort((a, b) => a.month.localeCompare(b.month))
}

export function forecastTotalsByUom(file: ForecastFile, horizon: number) {
  return sortUoms(file.byUomMonth.map((r) => r.uom)).map((uom) => ({
    uom, total: forecastByUom(file, uom, horizon).reduce((s, r) => s + r.predicted, 0),
  }))
}

export function forecastMonths(file: ForecastFile, horizon: number): string[] {
  return [...new Set(file.byUomMonth.filter((r) => (r.horizon ?? 0) <= horizon).map((r) => r.month))].sort()
}

export interface SeriesSummary { seriesId: string; materialId: string; materialGroup: string; materialType: string; uom: Uom; total: number; peakMonth: string; peak: number }

/** Per-series total over the horizon (one series = one unit, so this sum is unit-safe). Sorted by total desc. */
export function topSeries(rows: ForecastRow[], horizon: number, uom?: Uom, group?: string): SeriesSummary[] {
  const m = new Map<string, SeriesSummary>()
  for (const r of rows) {
    if (r.horizon > horizon || (uom && r.uom !== uom) || (group && r.materialGroup !== group)) continue
    const s = m.get(r.seriesId) ?? { seriesId: r.seriesId, materialId: r.materialId, materialGroup: r.materialGroup, materialType: r.materialType, uom: r.uom, total: 0, peakMonth: r.month, peak: -Infinity }
    s.total += r.predicted
    if (r.predicted > s.peak) { s.peak = r.predicted; s.peakMonth = r.month }
    m.set(r.seriesId, s)
  }
  return [...m.values()].sort((a, b) => b.total - a.total)
}

/** One series with its P10/P90 band (the band is never aggregated). */
export function seriesBand(rows: ForecastRow[], seriesId: string, horizon: number) {
  return rows.filter((r) => r.seriesId === seriesId && r.horizon <= horizon).sort((a, b) => a.month.localeCompare(b.month))
}

export function backtestByUom(file: HoldoutFile, uom: Uom) {
  return file.byUomMonth.filter((r) => r.uom === uom).sort((a, b) => a.month.localeCompare(b.month))
}

export function backtestSeries(file: HoldoutFile, seriesId: string): BacktestSeriesRow[] {
  return file.series.filter((r) => r.seriesId === seriesId).sort((a, b) => a.month.localeCompare(b.month))
}

export function backtestTopSeries(file: HoldoutFile, uom?: Uom) {
  const m = new Map<string, { seriesId: string; materialGroup: string; uom: Uom; actual: number }>()
  for (const r of file.series) {
    if (uom && r.uom !== uom) continue
    const s = m.get(r.seriesId) ?? { seriesId: r.seriesId, materialGroup: r.materialGroup, uom: r.uom, actual: 0 }
    s.actual += r.actual
    m.set(r.seriesId, s)
  }
  return [...m.values()].sort((a, b) => b.actual - a.actual)
}
