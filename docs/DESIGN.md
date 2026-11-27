# Design — Plant 1 inventory dashboard

**Reference / direction:** "Linear/Vercel-calm" enterprise. The repository had no web app, design file or committed tokens at the start of S-3 (only README + data), so the greenfield stack applies and the tokens in `src/styles/tokens.css` are the single source of design values.

## Stack
Vite + React 18 + TypeScript, Tailwind 3 on CSS-variable tokens (`tailwind.config.js` has no literals), ECharts for charts, TanStack Table + TanStack Virtual for the material tables, lucide icons, Vitest + Testing Library.

## Tokens (all in `src/styles/tokens.css`)
- **Type:** one family (Inter/Geist/system-ui stack); scale 12/14/16/20/24/32 with paired line heights. Headings differ by size, weight and colour from body and muted captions.
- **Spacing:** 4px scale (`space-1..16`); page padding and gaps are from it. Content is centred, max width `--page-max` (80rem).
- **Colour:** neutral surfaces, one accent (teal-blue), semantic success / warning / danger / info. 1px borders at 12% alpha. Dark theme has its own values; depth comes from lighter surfaces, not shadows.
- **Radii:** `sm`, `md` (+ `full` for pills). **Elevation:** `elev-1/2/3`. **Control heights:** 32/36/40; touch targets 40.
- **Motion:** one duration (180ms) and one easing; zero under `prefers-reduced-motion`.
- **Charts:** series colours `--chart-1..4`, band `--chart-band`, grid `--chart-grid`, read from the computed style at render time so charts follow the theme.

## Semantic colour use
KPI direction comes from `catalog.direction`: `higher_is_better` up = success, down = danger; `lower_is_better` the reverse; `neutral` is never coloured good/bad. Inventory status chips: shortage/stockout = danger, understock/slow = warning, excess/non-moving/obsolete = info, normal = success.

## Quantity-first conventions
- Default measure is Quantity; a Quantity / Value (INR) toggle lives in the URL (`?measure=qty|inr`). INR is formatted in lakh/crore (₹1.25 Cr) with the full value as tooltip.
- Every quantity is labelled with its unit (EA, SET, L). Totals are per unit or per material group; no cross-unit sums are rendered. Mixed-unit source KPIs (`CONSUMPTION_QTY`, `GROSS_INVENTORY_QTY`) are tagged "mixed units — trend shape only".
- Backtest uses a distinct dashed/hatched style and a "BACKTEST — not a forecast" badge; forecast shows its band (P10–P90) only on series-level data.

## States
Every screen has a skeleton loading state in final layout, an empty state that explains what belongs there, and an inline recoverable error with a Retry action. The disclaimer and as-of date are shown in the header/footer of every screen.

## Responsive
Desktop (1440): sidebar nav + content grid. Phone (390): top bar with a menu drawer, single column, tables become horizontally scrollable with sticky first column; all targets ≥ 40px.
