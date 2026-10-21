---
id: people-births-age-shape-narrow
title: "Births by age band follow the plan score's narrow age peak: 25 to 29 run about 5 times the CDC count and 35 to 44 run near zero, while the total is right"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: people-full-couples-plan-share-fell
source: added with npm run pool -- add
---

**What.** Measured Oct 21 in three drawn one-year runs (seed f43822a678303738, Blountsville AL, Marlboro Meadows MD, South Greeley WY): full births 51 against 41.5 expected, but ages 25 to 29 give 30 against about 6 and 35 to 44 give 0 against about 15. The age term of the plan score (renewalAgeCenter 30, renewalAgeSpread) is fitted to couples and is too narrow for the CDC shape, which peaks at 25 to 34 and has a long tail to 44.

**Rules.** No dice: the age term stays a sliding scale; CDC rates check band totals only. One model, two tiers: counted and full women share the shape.

**Done when.** In three drawn one-year buildBenchWorld runs, full women's births per thousand in each 5-year band from 20 to 44 fall within the Poisson spread of the CDC band count, shown by birth record ids, in src/core2/births-full-coverage.test.ts.

**Files.** src/core2/births-plan.ts,src/core2/data/renewal/parameters.json,src/core2/births-full-coverage.test.ts

**Notes.** TODO
