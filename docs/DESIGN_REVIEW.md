# Design review — HZL_DEMO_01 dashboard (PR #3, preview port 41000)

Reviewer: independent (not the builder). Round 1. Verdict: **FAIL — 3 of 12 items**.

Method: 28 loads (7 screens x 1440/390 x light/dark) driven by a script (review/audit.cjs, results in review/audit.json) measuring horizontal overflow, touch targets, text contrast (WCAG ratio per text node), console errors, font families and sizes, then keyboard Tab focus. CSS read in src/styles/index.css and tokens.css.

Limits: I could not view the screenshot images in this session, so the visual-judgement items (1, 2, 3) are scored on measured evidence only. A second script for the loading and error states crashed (the headless browser would not relaunch), so item 7 is scored from the code, not from the browser.

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | First impression | PASS (measured only) | One product shell on all 7 screens; header carries plant, as-of date and the simulated-POC disclaimer; 0 console errors or warnings in 28 loads |
| 2 | Hierarchy | PASS (measured only) | Exactly one h1 per screen; sizes 12/14/16/24 with weight differences |
| 3 | Alignment and spacing | PASS (measured only) | No horizontal overflow and no element wider than the viewport at either width |
| 4 | Typography | PASS | Single family (Inter); scale 12/14/16/24 |
| 5 | Colour | **FAIL** | Light theme only: text below 4.5:1. "mixed units" 4.26, "Normal" 4.27, "Medium" 4.26, "WAPE below 1, total within..." 4.27, "backtest" badge 3.99, "backtest · not a forecast" 4.26, "backtest · P10–P90" 4.26, and the "As of 31 Dec 2025 · ..." caption on every screen 4.44. Dark theme: 0 failures |
| 6 | Components | **FAIL** | `.btn` (theme toggle, Open menu, other buttons) has no visible focus state, see item 10 |
| 7 | States | PASS (code only) | Skeleton (src/components/States.tsx) and inline ErrorState (gate.tsx) exist and are wired through the gate. Not exercised in the browser |
| 8 | Responsive | PASS | 390px and 1440px: 0 overflow, 0 controls under 40x40 on all 28 loads |
| 9 | Dark mode | PASS | Own token values (tokens.css); 0 contrast failures on all 14 dark loads |
| 10 | Accessibility | **FAIL** | Focus ring missing on `.btn`. Dark theme at 390px: the first focused BUTTON computes box-shadow none. Cause: `.btn` applies `shadow-1` in the components layer, which comes after the base-layer `:focus-visible` rule, so it replaces the ring. In light theme the reading of "shadow present" is the elevation shadow, not the ring. Labels: 0 unlabelled inputs; touch targets pass |
| 11 | Copy | PASS | Specific labels; backtest labelled as a backtest, plan vs actual labelled value-based; no placeholder text found |
| 12 | Motion | PASS | `prefers-reduced-motion` rule zeroes animation and transition durations (index.css) |

## Fixes for the builder (exactly these)

1. **Colour**: raise `--color-fg-subtle` in light (currently #64748b) to about #526074 or darker so 12px text reaches 4.5:1. Re-check the "As of" caption, the Badge tones (Normal, Medium, backtest, mixed units) and the backtest chips. Re-measure the `backtest` badge, which is the worst at 3.99.
2. **Components / Accessibility**: make the focus ring beat `.btn`'s elevation shadow, e.g. `.btn:focus-visible, .card:focus-visible { box-shadow: var(--focus-ring), var(--shadow-1); }` or an `outline: 2px solid var(--color-accent); outline-offset: 2px` on `:focus-visible` instead of a box-shadow. Verify with Tab in light and dark at both widths.

Re-review needed after the fix: re-run review/audit.cjs (expect lowCount 0 in light, ring present on every focused element) and exercise the loading and error states in the browser.

## Status (end of round 1)

Round 1 verdict stands: **FAIL, items 5, 6 and 10.** The fixes above have not been applied yet (src/styles/tokens.css still has `--color-fg-subtle: #64748b`, and src/styles/index.css still sets the ring as a box-shadow that `.btn` overrides).
A round-2 re-review was attempted but the headless browser would not launch (sandbox_browse and a direct Playwright launch both failed with "Target page, context or browser has been closed"), so no round-2 scores exist. Items 1-3 still need a human look at the screenshots, and item 7 still needs to be exercised in a browser.
