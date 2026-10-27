---
id: prices-vehicle-miles-fuel-spending-follows-miles
title: "A household's fuel spending follows the miles the outcome web says it drives"
area: world
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The price engine now scales the miles a household drives by the outcome web's factor on `traffic.vehicle-miles` where it charges a mileage fee, so the fee and the fuel tax refund follow the miles. The household's own spending on fuel does not read the same factor, so a law that moves driving changes the fee but not what the household spends at the pump. One chain should carry the miles to both.

**Rules.** An effect is a read: the engine that pays reads the factor when it pays. One model, two tiers: counted households take the same rule times their count. No dice.

**Done when.** The engine that charges a household for fuel reads the same miles factor as the mileage fee, and a played year of `buildBenchWorld` in a drawn place (seed named) shows a household's fuel payment changing with the factor, named by journal id, for a named household and a counted group alike.

**Files.** src/core2/modules/place-prices.ts, src/core2/cost-of-living.ts

**Notes.** Found by the laws lead's helper on `claude/web-vehicle-miles-traveled-per-resident`, Oct 25. Check first which engine charges fuel today.
