---
id: core-relocation-job-held-intermittent
title: "A played year once stopped with 'Invalid relocation: one living household, no job held' in a drawn place (seed not captured)"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #5149
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** One played year in a drawn place stopped with 'Invalid relocation: one living household, no job held', thrown by `relocatePeopleV1` in src/core2/state.ts when a mover still holds a job that has not ended. The place and seed were lost, and eight later runs of the same test did not reproduce it. Find which caller moves a person whose job is still live, reproduce it from a captured place and seed, and make that caller end the job first or not move the person.

**Rules.** Wire to the world: a person who moves away leaves their job through the jobs engine's end record, never by the move erasing it. No dice: whether someone moves follows their own circumstances, and this item changes only the order of the job ending and the move.

**Done when.** With the place and seed captured by src/core2/agreement-jobs-free.test.ts (it now names both on failure), the failing year runs a full played year in buildBenchWorld without the error, and a test in src/core2 holds the case by person record id; the owner plays it: a year runs to its end.

**Files.** src/core2/state.ts, src/core2/modules/moves.ts, src/core2/modules/counted-moves.ts, src/core2/agreement-jobs-free.test.ts

**Notes.** Seen Oct 19 once while testing branch claude/agreement-re-resolve-s7 (which deletes the pinned-job lookup); not reproduced in eight reruns there, so it may predate that branch. Run the test repeatedly on main and on that branch to compare.
