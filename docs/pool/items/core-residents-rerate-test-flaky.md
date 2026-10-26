---
id: core-residents-rerate-test-flaky
title: "residents.test.ts 're-rates full and counted workers' fails in some places on main (Foxborough, Massachusetts)"
area: core
kind: bug
priority: 3
size: S
status: done
claimed-by:
pr: #4912
blocked-on:
source: found Oct 17 while running the life-core test files for core-counted-drift-delete
---

**What.** `src/core2/residents.test.ts` ("re-rates full and counted workers from today") fails in some drawn places on main: with `GOLDEN_PATH_SEED=b768c280bc25c94aa8bf5b4f07ddb5c7` (Foxborough, Massachusetts) the counted worker's re-rated pay reads 0 where the test expects 135555. Find why the re-rate leaves the counted job unpaid in that place.

**Rules.** No dice: results come from the records. One rule for all 56 places.

**Done when.** The test passes with that seed and in ten other drawn places, and the PR body names the job and the re-rate record by id.

**Files.** src/core2/residents.test.ts, src/core2/modules/residents.ts

**Notes.** Fails the same way on main and on the counted drift deletion branch with that seed.
