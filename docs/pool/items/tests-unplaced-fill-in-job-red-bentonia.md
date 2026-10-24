---
id: tests-unplaced-fill-in-job-red-bentonia
title: "unplaced-fill-in-job.test fails on main in Bentonia, Mississippi: the returned household's unplaced workers are not back in its group"
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

**What.** src/core2/unplaced-fill-in-job.test.ts fails on clean main at 1312ffd17d with GOLDEN_PATH_SEED=250e0a499c5f34e9 in Bentonia, Mississippi (place 2805380). The failing check is "the household's unplaced workers are back in its group: expected 0 to be greater than 0", after 65 seconds. The commuter worker's household returns to the counts, but its group holds none of the unplaced workers it should take back. Whether returnCommuterPay or the test's reading of the group is wrong was not traced.

**Rules.** One model, two tiers: a commuter returned to the counts is one of the place's unplaced workers again, counted by the same rule as before they were filled in. Wire to the world: name the household, the commuter job id and the group's unplaced count from records. No dice.

**Done when.** The named Bentonia seed and a drawn place pass src/core2/unplaced-fill-in-job.test.ts. The PR body names the household, the commuter job id and the group's unplaced count before and after the return, and says whether settlement or the assertion was wrong; the fix fails its test when undone.

**Files.** src/core2/unplaced-fill-in-job.test.ts, src/core2/modules/residents.ts, src/core2/modules/counted-demotion.ts

**Notes.** Found Oct 24 while gating core-fill-in-returning-commuter-job-start; it fails identically on clean main.
