---
id: core-speed-rehouse-rent-per-review
title: "Speed: keep the town's typical rent through one homeless review"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: speed/cut-rehouse-rent
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T18:05:35.632Z
---

**What.** The monthly check of households without a home rebuilt the town's homes, rents and jobs once per household to find the typical rent. Storrs, Connecticut spent 58 seconds on this in its first year and 100 seconds in its second. The check should read the rents alone and keep the figure until it writes something. Found in a profile of Storrs, Connecticut (key 0973980), the Every place nightly's slowest place (530 s, then 1,075 s a year).

**Rules.** Speed: a country's year runs under 120 seconds; never scan the whole world or a whole history again for each person or each step. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** Done when Storrs, Connecticut (seed storrs-1) plays its first year faster than main, and both the Storrs and the Ringgold, Louisiana proofs match main with zero differing tables. Evidence: Storrs went from 341.6 to 282.3 seconds. Both proofs show zero differing tables, and the digests are the same as main's; npm run speed:year -- --seed long-1 --years 4 and --seed storrs-1 --place 0973980 --years 1 on main and on the branch, one process each, keep dev mode's records proof identical in every table, with the times in the PR body.

**Files.** src/core2/housing-homeless.ts, src/core2/modules/housing.ts

**Notes.** Lead: speed.
