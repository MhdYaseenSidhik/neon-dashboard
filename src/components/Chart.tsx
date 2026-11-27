import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkAreaComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import { useTheme } from '../lib/useTheme'
import { cssVar } from '../lib/chartTheme'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, MarkAreaComponent, CanvasRenderer])

interface Props { option: EChartsCoreOption; label: string; size?: 'md' | 'sm' }

/** ECharts wrapper. `label` is the accessible name; colours come from tokens at render time and follow the theme. */
export function Chart({ option, label, size = 'md' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inst = useRef<echarts.ECharts | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    inst.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)
    return () => { ro.disconnect(); chart.dispose(); inst.current = null }
  }, [])

  useEffect(() => {
    inst.current?.setOption(
      {
        animation: false,
        textStyle: { fontFamily: cssVar('--font-sans'), color: cssVar('--color-fg-muted') },
        backgroundColor: 'transparent',
        ...option,
      },
      true,
    )
  }, [option, theme])

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      data-testid="chart"
      className={size === 'sm' ? 'h-chart-sm w-full' : 'h-chart w-full'}
    />
  )
}
