---
id: core-counted-weight-headcount-red-maricopa
title: "counted-weight-headcount.test fails on main in Maricopa Colony, Arizona: counted workers' mean household weight is 3.115 at scale 3, over the 3.09 bound"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On clean main, src/core2/counted-weight-headcount.test.ts with the draw seed 7711218484ef671e9cff54d840d18ec70aa0caa29cb1bcc74aa732d3a8b2f5ff (Maricopa Colony, Arizona, place 0444450) fails at line 53: the counted workers' household weights average 3.115 when the town opens at countScale 3, above the test's 3 percent band (3.09). The test only opens the town, so the number comes from the representative weights collapseToTwoLevels fits to the census, not from play. Either the worker households' fitted weights drift above the scale in small places by design, which the band does not allow for, or the fit gives working households more weight than it should.

**Rules.** One model, two tiers: a counted worker stands for as many jobs as its household's weight, so the average weight of the employed counted households should match the scale the town opened at, within a measured spread. Never weaken a test: widening the band needs the measured spread across drawn places, not one place.

**Done when.** The pinned draw passes src/core2/counted-weight-headcount.test.ts, a random draw over all 56 also passes, and the PR body names the cause by file and line with the employed households' mean weight in at least three drawn places, place and seed named.

**Files.** src/core2/counted-weight-headcount.test.ts, src/core2/collapse.ts, src/bench/world.ts

**Notes.** Found Oct 23 by claude/sleepy-carson-f8omzd while rechecking PR 5295 (core-census-uncap-opening): the same draw fails with the same 3.115101550212461 on that branch and on clean main.
