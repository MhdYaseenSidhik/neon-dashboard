import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Boxes, CalendarRange, ClipboardList, FlaskConical, Gauge, LayoutDashboard, Menu, Moon, ShoppingCart, Sun, TrendingUp, X } from 'lucide-react'
import { useDataset } from '../data'
import { useTheme } from '../lib/useTheme'
import { formatDate } from '../lib/format'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/kpis', label: 'KPI scorecard', icon: Gauge },
  { to: '/health', label: 'Inventory health', icon: Boxes },
  { to: '/replenishment', label: 'Replenishment', icon: ShoppingCart },
  { to: '/forecast', label: 'Demand forecast', icon: TrendingUp },
  { to: '/backtest', label: 'Backtest', icon: FlaskConical },
  { to: '/plan', label: 'Plan vs actual', icon: ClipboardList },
]

export function Shell() {
  const m = useDataset('manifest')
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const plant = m.status === 'ready' ? m.data.plantName : 'Plant 1'
  const asOf = m.status === 'ready' ? formatDate(m.data.asOf) : '…'
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[var(--sidebar-w)_1fr]">
      <aside className={`${open ? 'block' : 'hidden'} border-b border-border bg-surface p-4 lg:sticky lg:top-0 lg:block lg:h-screen lg:border-b-0 lg:border-r`} aria-label="Primary">
        <div className="mb-6 hidden items-center gap-2 lg:flex"><CalendarRange size={20} className="text-accent" aria-hidden /><span className="text-base font-semibold">Inventory control</span></div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to} to={{ pathname: to, search: loc.search }} end={to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex min-h-ctl items-center gap-3 rounded-sm px-3 text-sm font-medium transition-colors ${isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-sunken hover:text-fg'}`}
            ><Icon size={16} aria-hidden />{label}</NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 order-first lg:order-none">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 lg:px-8" role="banner">
          <div className="flex min-w-0 items-center gap-3">
            <button className="btn lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden />}</button>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold" data-testid="plant-name">{plant}</div>
              <div className="text-xs text-muted">HZL_DEMO_01 · as of <time data-testid="as-of" dateTime={m.status === 'ready' ? m.data.asOf : undefined}>{asOf}</time> · ZSPR + ZSPN</div>
            </div>
          </div>
          <button className="btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}<span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span></button>
        </header>
        <div className="border-b border-border bg-warning-soft px-4 py-2 text-xs text-fg lg:px-8" role="note" data-testid="disclaimer">
          <strong className="font-semibold">Simulated POC data.</strong> {m.status === 'ready' ? m.data.disclaimer : 'Simulated POC figure. Not actual Vedanta or Hindustan Zinc performance and not a claim of realised savings.'}
        </div>
        <main className="mx-auto w-full max-w-page px-4 py-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  )
}
