---
id: core-voter-groups-weight-sum-order
title: "The voter-groups contract test fails on a float rounding gap between two sums of the same weights (Roanoke, VA)"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/voter-groups.test.ts line 102 asserts that the sample rows' weights sum to no more than the residents store's weighted count. Both sides add the same household weights in a different order and grouping, so the floats can differ in the last bits. On clean main dd3a0c4837 with GOLDEN_PATH_SEED 9b158da05be261bd88124c8ac03f9c87a8f3b73255ce9340a88771cf536c1e15 (the test draws Roanoke, Virginia [5168000], seed 84e03f71f0b2251b448cbd0f8fce71ae0eb199c26aef02fad6a5993a3b843b64) it fails with 133669.8880112198 > 133669.8880112064. It reddens golden-path spec M0-09 on any PR whose commit draws this seed (seen on #6048, head 8c1c54ff3d, place Anoka, Nebraska).

**Rules.** Ask why: the gap is rounding, named by the two summation orders, not a weight the sample invents. One rule, all 56 places: the bound holds for any drawn town's size.

**Done when.** voter-groups.test.ts passes on the recorded seed and on three fresh drawn places named in the PR body; the comparison allows only the rounding a sum of that many terms can carry (count times machine epsilon times the total), and every other assertion is unchanged.

**Files.** src/core2/voter-groups.test.ts

**Notes.** TODO
