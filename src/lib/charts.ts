import { baseAxes, palette } from './chartTheme'
import { formatInr, formatInrFull, formatMonth, formatNum, labelCode } from './format'

type Opt = Record<string, unknown>

/** Horizontal bar chart of one quantity per category; all categories share one unit. */
export function barQtyOption(cats: string[], vals: number[], unit: string, name: string): Opt {
  const p = palette(), b = baseAxes(p)
  return {
    grid: { ...b.grid, left: 8 }, tooltip: { ...b.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => `${formatNum(v, 1)} ${unit}` },
    xAxis: { type: 'value', name: unit, nameTextStyle: { color: p.muted }, ...b.yAxisBase },
    yAxis: { type: 'category', inverse: true, data: cats.map(labelCode), ...b.xAxisBase },
    series: [{ name: `${name} (${unit})`, type: 'bar', data: vals, itemStyle: { color: p.series[0], borderRadius: [0, 4, 4, 0] }, barMaxWidth: 20 }],
  }
}

export function barInrOption(cats: string[], vals: number[], name: string): Opt {
  const p = palette(), b = baseAxes(p)
  return {
    grid: b.grid, tooltip: { ...b.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => formatInrFull(v) },
    xAxis: { type: 'value', axisLabel: { color: p.muted, formatter: (v: number) => formatInr(v) }, splitLine: b.yAxisBase.splitLine },
    yAxis: { type: 'category', inverse: true, data: cats.map(labelCode), ...b.xAxisBase },
    series: [{ name, type: 'bar', data: vals, itemStyle: { color: p.series[1], borderRadius: [0, 4, 4, 0] }, barMaxWidth: 20 }],
  }
}

export function stackedPriorityOption(groups: string[], series: { name: string; data: number[] }[], unit: string): Opt {
  const p = palette(), b = baseAxes(p)
  const colors = [p.danger, p.warning, p.series[0]]
  return {
    grid: b.grid, legend: b.legend, tooltip: { ...b.tooltip, axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => `${formatNum(v, 0)} ${unit}` },
    xAxis: { type: 'value', name: unit, nameTextStyle: { color: p.muted }, ...b.yAxisBase },
    yAxis: { type: 'category', inverse: true, data: groups.map(labelCode), ...b.xAxisBase },
    series: series.map((s, i) => ({ name: `${labelCode(s.name)} (${unit})`, type: 'bar', stack: 'p', data: s.data, itemStyle: { color: colors[i] }, barMaxWidth: 20 })),
  }
}

export function lineOption(months: string[], series: { name: string; data: (number | null)[]; dashed?: boolean; colorIdx?: number }[], unit: string, opts: { yName?: string; fmt?: (v: number) => string } = {}): Opt {
  const p = palette(), b = baseAxes(p)
  const fmt = opts.fmt ?? ((v: number) => `${formatNum(v, 1)} ${unit}`)
  return {
    grid: b.grid, legend: b.legend, tooltip: { ...b.tooltip, valueFormatter: (v: number) => fmt(v) },
    xAxis: { type: 'category', data: months.map(formatMonth), ...b.xAxisBase },
    yAxis: { type: 'value', name: opts.yName ?? unit, nameTextStyle: { color: p.muted }, ...b.yAxisBase },
    series: series.map((s, i) => ({ name: s.name, type: 'line', data: s.data, showSymbol: months.length < 30, smooth: false, lineStyle: { width: 2, type: s.dashed ? 'dashed' : 'solid' }, itemStyle: { color: p.series[s.colorIdx ?? i] } })),
  }
}

/** Forecast / backtest line with a P10–P90 band (single series only; bands are never summed). */
export function bandOption(months: string[], mid: number[], lower: number[], upper: number[], unit: string, names: { mid: string; band: string; actual?: string }, actual?: (number | null)[]): Opt {
  const p = palette(), b = baseAxes(p)
  const series: Opt[] = [
    { name: 'base', type: 'line', data: lower, stack: 'band', symbol: 'none', lineStyle: { opacity: 0 }, tooltip: { show: false }, silent: true },
    { name: names.band, type: 'line', data: upper.map((u, i) => u - lower[i]), stack: 'band', symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { color: p.band }, tooltip: { show: false }, silent: true },
    { name: names.mid, type: 'line', data: mid, showSymbol: true, lineStyle: { width: 2, type: 'dashed' }, itemStyle: { color: p.series[0] } },
  ]
  if (actual) series.push({ name: names.actual ?? 'Actual', type: 'line', data: actual, showSymbol: true, lineStyle: { width: 2 }, itemStyle: { color: p.series[1] } })
  return {
    grid: b.grid, legend: { ...b.legend, data: [names.mid, names.band, ...(actual ? [names.actual ?? 'Actual'] : [])] },
    tooltip: { ...b.tooltip, formatter: (ps: { dataIndex: number }[]) => {
      const i = ps[0].dataIndex
      return `${formatMonth(months[i])}<br/>${names.mid}: ${formatNum(mid[i], 1)} ${unit}<br/>${names.band}: ${formatNum(lower[i], 1)} to ${formatNum(upper[i], 1)} ${unit}${actual && actual[i] !== null ? `<br/>${names.actual ?? 'Actual'}: ${formatNum(actual[i] as number, 1)} ${unit}` : ''}`
    } },
    xAxis: { type: 'category', data: months.map(formatMonth), ...b.xAxisBase },
    yAxis: { type: 'value', name: unit, nameTextStyle: { color: p.muted }, ...b.yAxisBase },
    series,
  }
}

export function planOption(months: string[], plan: number[], po: number[], gr: number[]): Opt {
  const p = palette(), b = baseAxes(p)
  const f = (v: number) => formatInrFull(v)
  return {
    grid: b.grid, legend: b.legend, tooltip: { ...b.tooltip, valueFormatter: f },
    xAxis: { type: 'category', data: months.map(formatMonth), ...b.xAxisBase },
    yAxis: { type: 'value', axisLabel: { color: p.muted, formatter: (v: number) => formatInr(v) }, splitLine: b.yAxisBase.splitLine },
    series: [
      { name: 'Plan (₹)', type: 'line', data: plan, lineStyle: { width: 2, type: 'dashed' }, itemStyle: { color: p.series[0] }, showSymbol: false },
      { name: 'Actual PO (₹)', type: 'line', data: po, lineStyle: { width: 2 }, itemStyle: { color: p.series[1] }, showSymbol: false },
      { name: 'Actual GR (₹)', type: 'line', data: gr, lineStyle: { width: 2 }, itemStyle: { color: p.series[2] }, showSymbol: false },
    ],
  }
}
