---
id: core-relocation-job-held-intermittent
title: "A played year once stopped with 'Invalid relocation: one living household, no job held' in a drawn place (seed not captured)"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #5404
after:
blocked-on:
model: opus
effort: medium
root: none
lead: jobs
source: added with npm run pool -- add
claimed-at:
---

**What.** One played year in a drawn place stopped with 'Invalid relocation: one living household, no job held', thrown by `relocatePeopleV1` in src/core2/state.ts. That message covers four different conditions (household missing, duplicate ids, a dead or foreign member, and a mover whose live job is outside the destination place), so the stop does not say which one happened. The place and seed of the first stop were lost, and eight later reruns did not reproduce it. Two later captures exist: Dover, New Hampshire (3318820, seed ee04c2985f301a47) in PR #5149 comments, and the counted-demotion test failures under the seeds in the Notes.

**Cause.** Needs cause. Looked at: src/core2/state.ts lines 1700 to 1720, where `relocatePeopleV1` throws "Invalid relocation: one living household, no job held" for four different conditions; the callers src/core2/modules/moves.ts (lines 967, 1087, 1835), src/core2/modules/counted-demotion.ts line 396 and src/core2/modules/partnerships.ts line 259; the only capture is in PR #5149 comments (Dover, New Hampshire, 3318820, seed ee04c2985f301a47), and src/core2/agreement-jobs-free.test.ts names the place and seed on failure.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: a person who moves away leaves their job through the jobs engine's end record, never by the move erasing it. No dice: whether someone moves follows their own circumstances; this item finds which condition fires and changes only the order of the job ending and the move. Ask why: the finding names the caller and the condition by record id.

**Done when.** A second session, not the builder, runs Dover, New Hampshire (3318820, seed ee04c2985f301a47) for a full played year in buildBenchWorld, in that place, and names which of the four conditions fires and which caller moves the person; this item is then rewritten with Found in code and a Fix. If it does not reproduce, the second session records the places and seeds tried in the Notes.

**Waits on.** Nothing. The first step is to run Dover, New Hampshire (3318820, seed ee04c2985f301a47) and name the caller.

**Files.** src/core2/state.ts, src/core2/modules/moves.ts, src/core2/modules/counted-moves.ts, src/core2/modules/counted-demotion.ts, src/core2/modules/partnerships.ts, src/core2/agreement-jobs-free.test.ts

**Notes.** Seen Oct 19 once while testing branch claude/agreement-re-resolve-s7 (which deletes the pinned-job lookup); not reproduced in eight reruns there, so it may predate that branch. Run the test repeatedly on main and on that branch to compare.

Sent back 2026-10-20 from PR #5404 (branch claude/relocation-moves-whole-s14): docs/pool/items/core-relocation-job-held-intermittent.md:20 requires the captured failing played year to finish and a regression held by person record id. This PR documents only an interrupted two-year Dover replay, and says it added no test for the moves.ts half. Passing the old stop is useful evidence, but does not show completion of the required year or a regression exercising this wrapper with the dead member. Add that record-id case and completed replay result; the open parent remains #5149.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5149 (branch claude/relocation-dead-member): The required played-world replay is still missing. The body says no seed was captured, but the PR comments supply Dover NH 3318820, seed ee04c2985f301a47, and report that this fix gets past Invalid relocation then stops at moves.ts with A whole household moves under its own id. Finish that ordinary generated-world route and name the moved household/records on a completed year; the hand-built one-living/one-dead state.test.ts fixture does not prove the eviction route stops crashing. Preserve the household identity and all living/dead membership invariants rather than narrowing the check.; finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): close (cannot reproduce; reopen with a captured seed).

Merge-first: stale, back to the pool (Merger 4, Oct 28): PR #5149 closed; branch claude/relocation-dead-member, last push Oct 19, sent back twice. Claiming this item transfers that branch to you.

Seed captured (wire-opening-and-home, Oct 28): `GOLDEN_PATH_SEED=0dd4dafa1edf35e8681a232b9ca4c09a npx vitest run src/core2/counted-demotion.test.ts` fails on clean main d4f61f3c07 with 'Invalid relocation: one living household, no job held', thrown at `relocatePeopleV1` (src/core2/state.ts:1643) from the test's own move of a filled-in household (src/core2/counted-demotion.test.ts:171). The test picks a counted household without a job; after `fillInPerson` the move is refused, so a filled-in member holds a job or the household is not one living household.

Seed captured (speed/group-quarters-population, Nov 1): `GOLDEN_PATH_SEED=6b47ca6d29c28046bb238b06d476cf66 npx vitest run src/core2/counted-demotion.test.ts -t "moved away"` fails on clean main edacbfc31f in Bloomingdale, Tennessee, with 'Invalid relocation: one living household, no job held': the test fills in a counted household with a share of the place's unplaced workers, fill-in gives that worker a commuter job (startCommuterJob, src/core2/modules/residents.ts), and the move then refuses the live job. That branch narrows the test's pick to households with no unplaced share; the move itself is this item's.
