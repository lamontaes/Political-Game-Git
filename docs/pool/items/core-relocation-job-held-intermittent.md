---
id: core-relocation-job-held-intermittent
title: "A played year once stopped with 'Invalid relocation: one living household, no job held' in a drawn place (seed not captured)"
area: core
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-core-relocation-job-held-intermittent
pr: #8584
after:
blocked-on:
model: sonnet
effort: low
root: none
lead: jobs
source: added with npm run pool -- add
claimed-at: 2026-11-11T04:51:30.751Z
checked: fable 2026-11-10
---

**What.** One played year in a drawn place stopped with 'Invalid relocation: one living household, no job held', thrown by `relocatePeopleV1` in src/core2/state.ts. That message covers four different conditions (household missing, duplicate ids, a dead or foreign member, and a mover whose live job is outside the destination place), so the stop does not say which one happened. The place and seed of the first stop were lost, and eight later reruns did not reproduce it. Two later captures exist: Dover, New Hampshire (3318820, seed ee04c2985f301a47) in PR #5149 comments, and the counted-demotion test failures under the seeds in the Notes.

**Cause.** Measured: it does not reproduce on main at 1bf1b5ee4e.

- **Dover, New Hampshire** (place key 3318820, seed ee04c2985f301a47), built with `buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey })`, played 25 months in 30-day steps to 2027-02-09 with no stop.
- **A fresh draw**, Baker, Louisiana (`drawPlace("cause-relocation-1", "m1-04")`, place key 2203985, bench seed efeaa81424f13f09), played 13 months with no stop.
- **The two `counted-demotion.test.ts` seeds in the Notes** (`GOLDEN_PATH_SEED=0dd4dafa1edf35e8681a232b9ca4c09a` and `6b47ca6d29c28046bb238b06d476cf66`) both pass, 4 of 4. The test was narrowed on Nov 1 to households with no unplaced share.

Read on main, each caller of `relocatePeopleV1` (src/core2/state.ts, line 1697; the guard at lines 1701 to 1720) now keeps the guard's conditions:

- **moves.ts, line 967:** the departure ends each mover's job first (`api.endJob`, line 948).
- **moves.ts, line 1087:** ends any live job first (line 1085) and counts the dead as moved (line 1074).
- **The returned members' move** (`returnedMembersLeave`, moves.ts line 1802): it is given only living people returned to the counts (`returnedMembersOf`, src/core2/modules/counted-moves.ts line 62). Demotion has already ended their full jobs (src/core2/modules/counted-demotion.ts, line 242 and after).
- **The eviction route** (src/core2/housing-homeless.ts, line 607): moves only living members (`viewOf`, line 462), and only when no member holds a job here (`holdsJob`, line 568).
- **A couple parting** (src/core2/modules/partnerships.ts, line 259): moves one living person within the same place.

What remains is that the guard throws one message for four conditions, so a future stop would again not say which one fired or for whom.

**Fix.** In `relocatePeopleV1` (src/core2/state.ts, lines 1701 to 1720), keep every condition and split the one error into four, each naming the person id, the household id and the move's source citation (which says who moved them):

- the household is missing;
- an id is listed twice;
- a mover is dead, or not a member of that household;
- a mover holds a live job outside the destination.

Update src/core2/state.test.ts, which matches the old message, so each condition has its own case. Change nothing else.

The lead may instead close this item as not reproduced, as the Oct 27 look-first audit proposed, and file the message split on its own.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: a person who moves away leaves their job through the jobs engine's end record, never by the move erasing it. No dice: whether someone moves follows their own circumstances; this item finds which condition fires and changes only the order of the job ending and the move. Ask why: the finding names the caller and the condition by record id.

**Done when.** A second session, not the builder, runs src/core2/state.test.ts and sees one case per condition, each failing move naming its person and household. It then plays a year in buildBenchWorld in Dover, New Hampshire (3318820, seed ee04c2985f301a47) and in one place it draws itself, named with its seed, with no stop. If a stop comes, the item is reopened with its message, which now names the condition and the person.

**Waits on.** Nothing.

**Files.** src/core2/state.ts (`relocatePeopleV1`, lines 1697 to 1720), src/core2/state.test.ts, src/core2/modules/moves.ts, src/core2/modules/counted-moves.ts, src/core2/modules/counted-demotion.ts, src/core2/modules/partnerships.ts, src/core2/housing-homeless.ts

**Notes.** Seen Oct 19 once while testing branch claude/agreement-re-resolve-s7 (which deletes the pinned-job lookup); not reproduced in eight reruns there, so it may predate that branch. Run the test repeatedly on main and on that branch to compare.

Sent back 2026-10-20 from PR #5404 (branch claude/relocation-moves-whole-s14): docs/pool/items/core-relocation-job-held-intermittent.md:20 requires the captured failing played year to finish and a regression held by person record id. This PR documents only an interrupted two-year Dover replay, and says it added no test for the moves.ts half. Passing the old stop is useful evidence, but does not show completion of the required year or a regression exercising this wrapper with the dead member. Add that record-id case and completed replay result; the open parent remains #5149.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5149 (branch claude/relocation-dead-member): The required played-world replay is still missing. The body says no seed was captured, but the PR comments supply Dover NH 3318820, seed ee04c2985f301a47, and report that this fix gets past Invalid relocation then stops at moves.ts with A whole household moves under its own id. Finish that ordinary generated-world route and name the moved household/records on a completed year; the hand-built one-living/one-dead state.test.ts fixture does not prove the eviction route stops crashing. Preserve the household identity and all living/dead membership invariants rather than narrowing the check.; finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): close (cannot reproduce; reopen with a captured seed).

Merge-first: stale, back to the pool (Merger 4, Oct 28): PR #5149 closed; branch claude/relocation-dead-member, last push Oct 19, sent back twice. Claiming this item transfers that branch to you.

Seed captured (wire-opening-and-home, Oct 28): `GOLDEN_PATH_SEED=0dd4dafa1edf35e8681a232b9ca4c09a npx vitest run src/core2/counted-demotion.test.ts` fails on clean main d4f61f3c07 with 'Invalid relocation: one living household, no job held', thrown at `relocatePeopleV1` (src/core2/state.ts:1643) from the test's own move of a filled-in household (src/core2/counted-demotion.test.ts:171). The test picks a counted household without a job; after `fillInPerson` the move is refused, so a filled-in member holds a job or the household is not one living household.

Seed captured (speed/group-quarters-population, Nov 1): `GOLDEN_PATH_SEED=6b47ca6d29c28046bb238b06d476cf66 npx vitest run src/core2/counted-demotion.test.ts -t "moved away"` fails on clean main edacbfc31f in Bloomingdale, Tennessee, with 'Invalid relocation: one living household, no job held': the test fills in a counted household with a share of the place's unplaced workers, fill-in gives that worker a commuter job (startCommuterJob, src/core2/modules/residents.ts), and the move then refuses the live job. That branch narrows the test's pick to households with no unplaced share; the move itself is this item's.

**Notes (cause finder, Nov 11).** Ran on main at 1bf1b5ee4e, one world at a time, with a scratchpad script that built the world and stepped 30 days at a time, catching any throw with its stack. Dover: 25 months, 404 seconds, about 4.7 GB at the end, `DONE 2027-02-09`. Baker, Louisiana: 13 months, 190 seconds, `DONE 2026-02-14`. Also ran `GOLDEN_PATH_SEED=<seed> npx vitest run src/core2/counted-demotion.test.ts` for both captured seeds: 4 passed each.

Still unknown: which condition fired in the original Oct 19 stop and in PR #5149's Dover capture. Both predate fixes on the eviction and demotion routes, so they may be gone. A stop after the message split will say.
