---
id: core-relocation-job-held-intermittent
title: "A played year once stopped with 'Invalid relocation: one living household, no job held' in a drawn place (seed not captured)"
area: core
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/relocation-job-held
pr: #5149
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T02:26:14.306Z
---

**What.** One played year in a drawn place stopped with 'Invalid relocation: one living household, no job held', thrown by `relocatePeopleV1` in src/core2/state.ts when a mover still holds a job that has not ended. The place and seed were lost, and eight later runs of the same test did not reproduce it. Find which caller moves a person whose job is still live, reproduce it from a captured place and seed, and make that caller end the job first or not move the person.

**Rules.** Wire to the world: a person who moves away leaves their job through the jobs engine's end record, never by the move erasing it. No dice: whether someone moves follows their own circumstances, and this item changes only the order of the job ending and the move.

**Done when.** With the place and seed captured by src/core2/agreement-jobs-free.test.ts (it now names both on failure), the failing year runs a full played year in buildBenchWorld without the error, and a test in src/core2 holds the case by person record id; the owner plays it: a year runs to its end.

**Files.** src/core2/state.ts, src/core2/modules/moves.ts, src/core2/modules/counted-moves.ts, src/core2/agreement-jobs-free.test.ts

**Notes.** Seen Oct 19 once while testing branch claude/agreement-re-resolve-s7 (which deletes the pinned-job lookup); not reproduced in eight reruns there, so it may predate that branch. Run the test repeatedly on main and on that branch to compare.

Sent back 2026-10-20 from PR #5404 (branch claude/relocation-moves-whole-s14): docs/pool/items/core-relocation-job-held-intermittent.md:20 requires the captured failing played year to finish and a regression held by person record id. This PR documents only an interrupted two-year Dover replay, and says it added no test for the moves.ts half. Passing the old stop is useful evidence, but does not show completion of the required year or a regression exercising this wrapper with the dead member. Add that record-id case and completed replay result; the open parent remains #5149.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5149 (branch claude/relocation-dead-member): The required played-world replay is still missing. The body says no seed was captured, but the PR comments supply Dover NH 3318820, seed ee04c2985f301a47, and report that this fix gets past Invalid relocation then stops at moves.ts with A whole household moves under its own id. Finish that ordinary generated-world route and name the moved household/records on a completed year; the hand-built one-living/one-dead state.test.ts fixture does not prove the eviction route stops crashing. Preserve the household identity and all living/dead membership invariants rather than narrowing the check.; finish on that branch, merge main into it first.
