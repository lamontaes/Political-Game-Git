---
id: core-counted-deaths-opening-small-draws
title: "Counted-deaths opening test fails when every drawn town is small"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5904
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** src/core2/counted-deaths-opening.test.ts fails on seed ca31b9e4225f7b58 because all six towns it draws expect fewer than 10 deaths, so the test has no town to check. The taxes helper saw it on Oct 24 and confirmed it fails the same with its estate change switched off, so it is not that change. The test needs a town whose expected deaths are enough to check, or a check that holds for small towns too.

**Rules.** One rule, all 56 places: the test may redraw only by a reason read from the town's own records (its expected deaths), naming every town it passed over, and never skip a state.

**Done when.** src/core2/counted-deaths-opening.test.ts passes on seed ca31b9e4225f7b58 and on two fresh random seeds named in the PR body, with every town it passed over named and why.

**Files.** src/core2/counted-deaths-opening.test.ts

**Notes.** TODO
