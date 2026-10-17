---
id: core-electorate-weight-test-red
title: "electorate-weight.test.ts fails on main in most runs: a counted voter in the scaled town does not carry the weight"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: found Oct 17 while running the life-core test files for core-counted-drift-delete
---

**What.** `src/core2/electorate-weight.test.ts` ("counts each counted voter as many times as its household stands for, and a town without weights is unchanged") fails in most runs on main at line 40: the scaled town's counted voters in the town do not all carry the weight (`townVoters.every(v => v.weight === SCALE)` is false). Find which counted voters keep a weight of one (newcomers, newborns, or households outside the scaled places) and whether the test or the opening is wrong.

**Rules.** No dice: results come from the records. One rule for all 56 places.

**Done when.** The test passes in ten drawn places in a row, and the PR body names a voter that carried the wrong weight by record id and the cause.

**Files.** src/core2/electorate-weight.test.ts, src/core2/electorate.ts, src/core2/counted-groups.ts

**Notes.** Fails the same way on main with and without the counted drift deletion (two of two runs).
