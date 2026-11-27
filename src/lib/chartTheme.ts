export const cssVar = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export function palette() {
  return {
    series: [cssVar('--chart-1'), cssVar('--chart-2'), cssVar('--chart-3'), cssVar('--chart-4')],
    band: cssVar('--chart-band'), grid: cssVar('--chart-grid'),
    fg: cssVar('--color-fg'), muted: cssVar('--color-fg-muted'), surface: cssVar('--color-raised'), border: cssVar('--color-border'),
    success: cssVar('--color-success'), warning: cssVar('--color-warning'), danger: cssVar('--color-danger'), info: cssVar('--color-info'),
  }
}

export function baseAxes(p = palette()) {
  return {
    grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', backgroundColor: p.surface, borderColor: p.border, textStyle: { color: p.fg } },
    legend: { top: 0, textStyle: { color: p.muted } },
    xAxisBase: { axisLine: { lineStyle: { color: p.border } }, axisLabel: { color: p.muted } },
    yAxisBase: { splitLine: { lineStyle: { color: p.grid } }, axisLabel: { color: p.muted } },
  }
}
