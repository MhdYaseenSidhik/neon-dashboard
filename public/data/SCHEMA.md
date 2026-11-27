# Dashboard data contract — Plant 1 (HZL_DEMO_01), schemaVersion 3

Source: Neon `neondb`, schema `public`, read through the Context Flow Neon integration only. Plant scope: `HZL_DEMO_01` (Hindustan Zinc Demo Plant 01). Material scope: `ZSPR` and `ZSPN`. As-of date: 2025-12-31 (data date, not run date).

**Disclaimer (shown with every figure):** Simulated POC figure. Not actual Vedanta or Hindustan Zinc performance and not a claim of realised savings.

**Backcast:** `backcastIncluded = false`. No row with `is_backcast_period = 'Y'` exists in the movement, snapshot, PO, PR or goods-receipt tables (counted 0 in this run). No backcast rows are included.

## Conventions
- Numbers are JSON numbers; months are `YYYY-MM`; dates are `YYYY-MM-DD`; missing values are `null`.
- **Quantity is the primary measure.** Rupee fields end in `Inr`/`_INR` and are secondary.
- `uom` is `ref_material_group.base_uom` joined on `material_group` (EA, SET or L). **Never add quantities across different `uom`.** Sum per material group or per `uom`. Quantity totals in `kpis.json` (`CONSUMPTION_QTY`, `GROSS_INVENTORY_QTY`, uom `QTY`) are published by the source as plant-wide sums across mixed units and are not unit-safe: use them for trend shape only, label them "mixed units", and prefer per-group quantities from `materials.json` / `inventory_summary.json`.
- `ALL_PLANTS` rows are not published. Every file is `plantId = HZL_DEMO_01`.

## manifest.json
`{schemaVersion: 3, generatedAt, asOf, plantId, plantName, materialTypes: [ZSPR, ZSPN], source, disclaimer, backcastIncluded, backcastNote, files: [{name, rows, generatedAt, source: {integrationId, syncId, assetId, sql}}], forecast: null | {...}}`. `forecast` is null until the forecast ticket adds it. `dims.json` came from query_preview (32 rows ≤ 100, not synced), so its `syncId`/`assetId` are a note / null.

## dims.json
`{plants: [{plantId, name, type, region}] (one plant), materialGroups: [{code, name, uom}], materialTypes: [{code, name}], criticality: [{code, name, serviceLevelPct}], movementClasses: [string], inventoryStatuses: [string]}`

## kpis.json
`{catalog: [{code, label, uom, direction: higher_is_better | lower_is_better | neutral, definition}], rows: [{month, plantId, kpiCode, value, uom, scenario}]}`
Source `inventory_kpi_monthly` for `HZL_DEMO_01`, scenario `SIMULATED_BASELINE`, 2022-01 to 2025-12. `uom` is the KPI unit: QTY, INR, COUNT, PCT, DAYS or RATIO. Quantity KPI codes: `CONSUMPTION_QTY`, `GROSS_INVENTORY_QTY` (mixed units, see above). Some KPIs start later (e.g. 37 months), so a month can lack a code.

## inventory_summary.json
`{asOf, rows: [{plantId, materialGroup, materialType, uom, criticality, movementClass, inventoryStatus, abcClass, materials, availableQty, valueInr}]}`
`inventory_classification` ⨝ `dim_material` ⨝ `ref_material_group`, grouped by those dimensions. `materials` is a count; `availableQty` (in `uom`) and `valueInr` are sums.

## materials.json
`{asOf, rows: [{materialId, plantId, description, materialGroup, materialType, uom, criticality, abcClass, xyzClass, movementClass, inventoryStatus, availableQty, valueInr, daysOnHand, daysSinceLastConsumption, safetyStockQty, reorderPointQty, maxStockQty, trailing12mDemandQty}]}`
One row per material × plant (storage locations summed: quantity and value summed, days / stock parameters MAX). All `*Qty` fields are in `uom`.

## reorder.json
`{asOf, rows: [{recommendationId, materialId, plantId, materialGroup, materialType, uom, criticality, priority, recommendedPrDate, recommendedQty, estimatedValueInr, availableQty, openPrQty, openPoQty, safetyStockQty, reorderPointQty, reason, shutdownId}]}`
From `reorder_recommendation`. All `*Qty` fields are in `uom`; `shutdownId` is null when not shutdown-driven.

## plan_vs_actual.json
`{rows: [{month, plantId, materialGroup, materialType, uom, shutdownDriven: boolean, planValueInr, actualPoValueInr, actualGrValueInr, varianceInr, variancePct}]}`
From `business_plan_vs_actual`. **Value-based only (INR): the source has no quantities.** `variancePct` is null when the plan value is 0. `uom` identifies the group's unit and is context only.

## forecast_holdout.json / forecast.json
Added by the forecast ticket (not part of this data refresh).
