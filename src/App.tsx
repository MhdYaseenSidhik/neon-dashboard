import { HashRouter, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { Overview } from './screens/Overview'
import { KpiScorecard } from './screens/KpiScorecard'
import { InventoryHealth } from './screens/InventoryHealth'
import { Replenishment } from './screens/Replenishment'
import { Forecast } from './screens/Forecast'
import { Backtest } from './screens/Backtest'
import { PlanVsActual } from './screens/PlanVsActual'

/** HashRouter so the static build works on gh-pages without server rewrites. */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Overview />} />
          <Route path="kpis" element={<KpiScorecard />} />
          <Route path="health" element={<InventoryHealth />} />
          <Route path="replenishment" element={<Replenishment />} />
          <Route path="forecast" element={<Forecast />} />
          <Route path="backtest" element={<Backtest />} />
          <Route path="plan" element={<PlanVsActual />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
