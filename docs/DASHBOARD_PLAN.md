# Dashboard plan — Plant 1 (HZL_DEMO_01)

Input: `public/data/` only (read-only). As-of 2025-12-31, ZSPR and ZSPN materials, no backcast rows. Every figure is a **simulated POC figure** and every screen shows the source disclaimer in the header banner and in the screen footer. See `docs/DATA_PROFILE.md` for the file profile and `docs/DESIGN.md` for tokens.

## Global rules
- **Quantity first.** Tiles, charts, default sort order, drill-downs and the forecast use quantity fields and `_QTY` KPI codes. Rupees appear only as a secondary column, tooltip or the **Quantity / Value (₹)** toggle (`?measure=inr`). Default is Quantity.
- **No cross-unit sums.** Units are EA, SET and L. Totals are shown per unit; charts and tables show one unit at a time (`?uom=`), and each material group has exactly one unit. Every quantity carries its unit.
- **Plant fixed** to HZL_DEMO_01 (locked field in the filter bar; header shows plant name and as-of date).
- **Filters in the URL**: `type`, `group`, `crit`, `status`, `priority`, `uom`, `measure`, `h` (horizon).
- Rupees in lakh/crore (₹1.25 Cr) with the full value in the tooltip.
- Every screen has a skeleton loading state, empty states and an inline error with Retry.
- KPI tiles are plant-level. With a type, group or criticality filter set, the plant value is kept and the tile states that it is not filtered.

## Screens
| # | Screen (route) | Reads | Content |
|---|---|---|---|
| 1 | Overview `/` | inventory_summary, kpis, reorder | Per-unit available stock tiles (EA, SET, L), per-unit recommended order quantity, plant KPI tiles (stockout lines, critical spare availability, days on hand), available quantity by material group and by stock status (one unit at a time), mixed-unit KPI trend, value toggle |
| 2 | KPI scorecard `/kpis` | kpis (catalog + rows) | Cards for every catalog code present, latest month vs prior month, sparkline, colour by `catalog.direction`, quantity KPIs first and flagged "mixed units", monthly chart for the selected KPI |
| 3 | Inventory health `/health` | inventory_summary, materials | Drill: material group chips and status chips filter a virtualised, sortable materials table. Quantity columns carry units; default sort availableQty desc; ₹ value column only with the toggle |
| 4 | Replenishment `/replenishment` | reorder | Recommended quantity per unit, priority line counts, stacked chart by group and priority (one unit), virtualised table sorted by recommendedQty desc; ₹ estimated value only with the toggle |
| 5 | Demand forecast `/forecast` | forecast (+ manifest) | 3 / 6 / 12-month horizon switch, per-unit totals, monthly total line (no band, because bands cannot be summed), single-material forecast with P10–P90 band, top materials table. If `available` is false: reason shown, no series |
| 6 | Backtest `/backtest` | forecast_holdout (+ manifest) | Banner "This is a backtest, not a forecast", MAE, WAPE, model metric, verdict and reasons, predicted vs actual by month per unit, single-series band vs actual |
| 7 | Plan vs actual `/plan` | plan_vs_actual | Rupee-only, with a visible "value-based (₹)" banner; plan, PO, GR, variance by month and by material group |

## KPI definitions
From `kpis.json.catalog` (25 codes). The dashboard uses the catalog `label`, `uom`, `direction` and `definition`; nothing is derived.
- Direction colouring: `higher_is_better` rises are green; `lower_is_better` rises are red; `neutral` is never coloured good or bad.
- Headline quantity codes: `GROSS_INVENTORY_QTY` and `CONSUMPTION_QTY` (uom `QTY`, both **mixed-unit** sums).
- Percent change is the latest month against the previous month with a value for that code.
- ALL_PLANTS rows are not published for this plant; the dashboard never sums plants.

## Forecast and backtest definitions
- Target: net consumption quantity (movement 261 minus 262), grain material × month, series `material_id|plant_id`.
- Forecast = 2026-01 to 2026-12 (`forecast.json`, horizon 1–12). Horizon 3 / 6 / 12 selects months 1–3, 1–6, 1–12.
- Backtest = 2025-01 to 2025-12 held-out months (`forecast_holdout.json`), always labelled as a backtest.
- MAE and WAPE come from `forecast_holdout.json.error`; verdict and reasons from `manifest.json.forecast`.

## GAPS
1. **Only two `_QTY` KPI codes, both mixed-unit.** `GROSS_INVENTORY_QTY` and `CONSUMPTION_QTY` add EA, SET and L together, so the level is not interpretable. The dashboard flags them "mixed units" and shows per-unit quantities from `inventory_summary`/`materials`. Needs per-unit `_QTY` KPI rows.
2. **No quantity version of several headline KPIs** (non-moving, slow-moving, obsolete, on-order, receipts, shutdown and maintenance consumption exist only in ₹ or as shares). They are shown as published (₹ only behind the toggle, shares as %), not derived.
3. **`GROSS_INVENTORY_QTY` (82,221.62 in 2025-12) does not equal the sum of `inventory_summary` availableQty (81,801.74 across units).** Different definitions or scopes; not reconciled in the data.
4. **Forecast and backtest files hold the top 2,000 of 5,948 series** (24,000 rows each, file-size cap). Per-material tables and bands cover those 2,000. The all-series monthly totals (`byUomMonth`) cover all 5,948. The horizon-total tiles use `byUomMonth`.
5. **No ALL_PLANTS or other plants**, by design (single-plant scope), so no cross-plant comparison.
6. **Forecast band is per series only.** P10/P90 cannot be summed, so total lines have no band.
7. **Context Flow generalization verdict not read.** `manifest.forecast.verdict` is published as "not read from Context Flow (see verdictReasons)". The Backtest screen shows that text and the reasons as published and claims no verdict of its own; WAPE 0.203 and the predicted/actual ratio 0.992 are shown as computed values.
8. **Covariate importance is 0 for all six covariates** (per manifest reasons), so the forecast relies on each series' own history. Shown in the backtest verdict reasons.
9. **plan_vs_actual has no quantities or units**, so it stays in rupees. `varianceInr` is plan minus actual PO (positive = under plan); the screen explains it.
10. **No stock-vs-time series for quantity.** Quantity by group/status is a snapshot at the as-of date; no monthly per-unit inventory history is published.
11. **Total forecast line has no actuals overlay.** The files hold 2026 forecast months and 2025 backtest months only; no 2022–2025 history by unit is published, so the forecast chart cannot show history before it.
12. **No Figma or committed design file was in the repo** at the start; tokens were authored in `src/styles/tokens.css` (direction "Linear/Vercel-calm", see `docs/DESIGN.md`).
