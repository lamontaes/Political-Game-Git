---
id: core-speed-rehouse-rent-per-review
title: "Speed: keep the town's typical rent through one homeless review"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: speed/cut-rehouse-rent
pr: #7015
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T18:05:35.632Z
---

**What.** The monthly check of households without a home rebuilt the town's homes, rents and jobs once per household to find the typical rent. Storrs, Connecticut spent 58 seconds on this in its first year and 100 seconds in its second. The check should read the rents alone and keep the figure until it writes something. Found in a profile of Storrs, Connecticut (key 0973980), the Every place nightly's slowest place (530 s, then 1,075 s a year).

**Rules.** Speed: a country's year runs under 120 seconds; never scan the whole world or a whole history again for each person or each step. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** In the played world (npm run speed:year, which builds it with buildBenchWorld), Ringgold, Louisiana over four years (seed long-1) and Storrs, Connecticut over one (key 0973980, seed storrs-1) keep dev mode's records proof identical to main in every table; the housing tests (src/core2/housing-homeless.test.ts and the others the PR names) pass with bookkeeping on, which checks each kept rent against townFigures and throws on any difference; and Storrs's first year runs faster, with the times in the PR body.

**Files.** src/core2/housing-homeless.ts, src/core2/modules/housing.ts

**Notes.** Lead: speed.
