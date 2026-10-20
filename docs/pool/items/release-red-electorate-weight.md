---
id: release-red-electorate-weight
title: "electorate-weight test fails at line 40: a counted voter is not counted as many times as its household stands for"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/electorate-weight-red
pr: #5318
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:48:23.791Z
---

**What.** The electorate-weight test fails at line 40, where it expects true and gets false: a counted voter is not counted as many times as its household stands for. Find which side is wrong, the electorate input that should multiply a counted voter by its household weight or the test's expectation, and fix it so the town's vote count follows the weight. The town's vote totals then match its counted households.

**Rules.** Fix at the root: a red test is fixed in place or the code it guards is, never skipped or loosened. No dice. One rule, all 56 places: the place facts come from data, and the test names the place and seed it drew. One model, two tiers: a counted group is read with the same rule as a full person, times its count.

**Done when.** In a drawn town opened at its Census scale (place and seed named in the PR body) every counted voter is counted as many times as its household stands for, and src/core2/electorate-weight.test.ts passes.

**Files.** src/core2/electorate-weight.test.ts, src/core2/electorate-inputs.ts, src/core2/electorate.ts

**Notes.** Found by running src/core2 on main, Oct 19 (release-suite-red-list-on-main): AssertionError 'expected false to be true' at electorate-weight.test.ts:40. The failure did not print the place or seed; print them first.
**Notes.** PR #5318 sent back: Merge conflict with main in src/core2/electorate-weight.test.ts.

