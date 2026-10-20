---
id: release-red-electorate-weight
title: "electorate-weight test fails at line 40: a counted voter is not counted as many times as its household stands for"
area: gov
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/red-electorate-weight
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:57:24.608Z
---

**What.** `src/core2/electorate-weight.test.ts` failed at line 40 on every run: it demanded that every counted town voter carry exactly the household scale (3), but the collapse to two levels now fits each household's weight to the Census count for its size, so a town's records carry weights near 3 (3.07, 3.4, 5 and so on). Weights, ranks and the vote count in the test now agree to the tolerances that fitted weights allow, so the test checks the invariant it was written for, that a counted voter stands for as many real voters as its household says, without the exact-equality premise the fit made stale.

**Rules.** One model, two tiers: a counted voter is read with the same rule as a full voter, times its weight. Sliding scales and causes: nothing in the test depends on a threshold. This is a test repair, not a loosening to pass: the means, the total and the vote shares are still bounded and fail when weights are dropped or double counted.

**Done when.** `src/core2/electorate-weight.test.ts` passes on five consecutive runs, each in a random place drawn from all 56, and fails if the weights are ignored (the mean weight bound and the total ratio bound).

**Files.** src/core2/electorate-weight.test.ts

**Notes.** Oct 20 (claude/red-electorate-weight). Probe in Henning, Minnesota with countScale 3: 767 town voters, weights 3 for 628 of them and 3.07, 3.1, 3.125, 3.4, 3.75 and 5 for the rest. The sum of weights ran 0.2 to 6 percent above 3 times the plain count; the cast votes differed by 0.2 to 2 percent. An earlier PR (#4905, core-electorate-weight-test-red) also touched this test.
