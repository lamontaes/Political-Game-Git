---
id: tests-press-money-dawson-springs-red
title: "press-money fails on main for seed 87f9d8a36f733083: Dawson Springs, Kentucky's paper never gains readers and revenue in the same month"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/press-money.test.ts fails on main with GOLDEN_PATH_SEED=87f9d8a36f733083. Its first draw, Dawson Springs, Kentucky (2120224), place seed cb670b23a8bfc0787ac8adf6af104ac8b022be4acf201ee326c4c7118b509e66, never has a month when the paper's readers and its revenue both rise, so the check that revenue follows the audience fails over March 2025 to January 2026. Either the outlet's revenue there truly does not follow its readers (a defect in the press money rule) or the town is too small for the check's shape and the test needs to say so from the record. The test draws its place at random, so CI turns red on any change whose run lands here.

**Rules.** Ask why: the fix names, by record, why the readers and the revenue move as they do in Dawson Springs before changing the rule or the check. One rule, all 56 places: no place-specific branch. Every number lives in a parameter table.

**Done when.** src/core2/press-money.test.ts passes on seed 87f9d8a36f733083 and on three fresh seeds the builder did not choose, in the played world, with the cause in Dawson Springs named by record in the PR body.

**Files.** src/core2/press-money.test.ts, src/core2/modules/press.ts

**Notes.** TODO
