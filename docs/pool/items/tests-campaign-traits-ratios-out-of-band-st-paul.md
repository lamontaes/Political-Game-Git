---
id: tests-campaign-traits-ratios-out-of-band-st-paul
title: "Two campaign trait ratios fall outside their band in St. Paul, Oregon: the pollster odds ratio and the retelling reach ratio"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/traits-ratios-st-paul
pr: #6261
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T06:57:43.136Z
---

**What.** src/core2/modules/campaigns.traits.test.ts fails twice when its draw lands on St. Paul, Oregon (4164850, base seed 174063ebf76ebfbc632befa6193ec00525ce6df2, played from June 16, 2026 to just after the November 3 race). The pollster case reads an odds ratio of 4.06 between the top and bottom thirds of lean, against a ceiling of 3.65 around the researched 1.66. The retelling case reads a reach ratio of 24.8 against a ceiling of 5.9, which means the bottom third's mean retelling multiplier is close to zero there. Both read the town's adults and their traits only, and both fail with the same numbers whether the door rule of lamontaes/Political-Game-Git#6065 is in or out.

**Rules.** No dice: the ratios check totals, never an actor's outcome. One rule, all 56 places: the test draws its place, and a band that one small town breaks either holds a wrong slack for a town that size or shows a real skew in that town's people; name which. Ask why: the cause is named by record, not by retrying the draw.

**Done when.** src/core2/modules/campaigns.traits.test.ts passes in St. Paul, Oregon with base seed 174063ebf76ebfbc632befa6193ec00525ce6df2 and in a fresh random draw, and the PR names why the two ratios ran outside the band there (the town's adults by lean third, with the counts behind each mean), with the fix in the engine or in the test's band for a town that size, each change justified by that read. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/modules/campaigns.traits.test.ts, src/core2/trait-decisions.ts

**Notes.** Found Oct 25 by the speed lead while checking lamontaes/Political-Game-Git#6065: run with GOLDEN_PATH_SEED=174063ebf76ebfbc632befa6193ec00525ce6df2; the hook picks St. Paul on its third try (seed suffix :2). Both failures repeat exactly with the old door rule, so they are not that PR's.
