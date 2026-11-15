---
id: world-home-prices-past-buyers-and-sellers
title: "Before day one, a town's home price level weighs the households that bought and sold and left, not only pay and rates"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: world-home-prices-from-housing
blocked-on:
lead: money
model: opus
effort: medium
root: design-one-model-two-tiers
checked: Account lead T49 2026-11-14
source: Account lead T49 building world-home-prices-from-housing; the coordinator's condition 3 (Nov 14, 2026)
---

**What.** In play, a town's home price level moves with its pay, the mortgage rate and the month's buyers against homes offered. Before day one the third term is zero, so every town's past prices move only with the economy's pay and rates, and two towns in one world share one past path. Seen: Metrics' typical home value for last year on day one, and the price a household paid in its `housing.home-bought` history row.

**Cause.** Design: owner, Nov 13, 2026 (docs/coordination/OWNER-DECISIONS.md: the past is simulated so the present makes sense), and the households that bought and sold before day one and left the town are not in the world (SG-HIST-housing-past-todays-households), so the history pass can't weigh the past's buyers against its sellers. Registered as SG-WORLD-housing-price-past-pressure (src/core2/housing-price-path.ts, `pricePathTo`).

**Fix.** Once the moves pass writes the departures and arrivals before the start as records (sellers leaving, buyers arriving), count them by month and place and step each place's past path with the same pressure term play uses (`stepLogLevel` in src/core2/housing-prices.ts). A place's past path then becomes its own, and the shared path in `pricePathTo` becomes per place.

**Time box.** 4 hours for one Opus session at medium effort.

**Rules.** One rule: the past step is play's step. No dice: counts of recorded moves, never a draw. Speed: one step per place per month of the window, at generation.

**Done when.** A second session opens two drawn places in one world and sees their last-year typical home values on day one differ because their past moves differ, named by the move records counted.

**Waits on.** world-home-prices-from-housing; the moves pass keeping departures before the start.

**Files.** src/core2/housing-price-path.ts, src/core2/housing-past.ts

**Notes.** Filed by Account lead T49 on its own branch.
