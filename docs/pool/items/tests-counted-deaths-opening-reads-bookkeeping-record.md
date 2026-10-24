---
id: tests-counted-deaths-opening-reads-bookkeeping-record
title: "counted-deaths-opening.test reads the monthly counts record with bookkeeping off, where it is never kept, so it fails for every seed"
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

**What.** src/core2/counted-deaths-opening.test.ts turns bookkeeping off, plays four months in up to six drawn places, and reads the renewal engine's monthly counts table to find a place that expected at least 10 counted deaths. Since Oct 17 (commit d3e204ac90, 'keep the monthly counted record only under bookkeeping') that table is written only with bookkeeping on, so every draw reads an empty table, skips, and the test fails with none of 6 drawn places. It fails on clean main for seed 9277978b6837717a (run Oct 24 by the speed lead) and for any seed. The test should read what play keeps (the counted illness and death records) or run its world with bookkeeping on, without narrowing what it checks.

**Rules.** Never narrow or skip a test: the check that opening illnesses are booked and counted people die from the first months stays. Bookkeeping is a debug switch: a test that reads a bookkeeping record runs with bookkeeping on.

**Done when.** npx vitest run src/core2/counted-deaths-opening.test.ts passes in the played world (buildBenchWorld) for GOLDEN_PATH_SEED=9277978b6837717a and two other seeds, naming the drawn place and seed it proved, with the same assertions on opening illnesses and deaths as today.

**Files.** src/core2/counted-deaths-opening.test.ts

**Notes.** Found Oct 24 by the speed lead while testing core-speed-counted-renewal-pass; red on main, not caused by that change.
