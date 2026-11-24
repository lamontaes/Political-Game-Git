---
id: tests-town-jobs-real-work-draws-at-run-time
title: "The town-jobs test draws its places at run time and its failure does not name the seed that drew them"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: jobs
model: sonnet
effort: medium
source: "Industries thread, Nov 16 (the gate on #9627)"
---

**What.** `src/core2/town-jobs-real-work.test.ts` picks a fresh random seed every run (`randomBytes(8)` unless `TOWN_JOBS_SEED` is set) and draws its two places from it. On #9627's gate it failed once and passed on the next run at the same head and on the base; the failure line named the place and the world seed but not the outer seed, so the draw could not be replayed and the fault could not be found. Seen: one red run of the test on the wholesale branch, head 4ca75594, Nov 16, not reproduced since.

**Cause.** Found in code: `src/core2/town-jobs-real-work.test.ts`, line 41, `const seed = process.env.TOWN_JOBS_SEED ?? randomBytes(8).toString("hex")`; the `where` string of each assertion holds `place.seed` but not `seed`, so `drawPlace(`${seed}:${draw}`, ...)` cannot be redone from the message.

**Fix.** Pin the test to two named places with fixed seeds (found by a script outside the test, as the pinned-tests skill says), keeping every check it makes, and file the run-time draw's hunt for faults as a separate script if it is still wanted. The player sees it only as a game that offers jobs from the first week; the check guards that.

**Time box.** 2 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Rules.** One rule, all 56 places: the pinned places are found by drawing from all 56 outside the test and named in it with their seeds. Never weaken a test: every check the test makes today stays.

**Done when.** The test runs pinned to two named places and seeds, red once on a base that breaks the town's openings, and a drawn place nobody chose is checked by a second session in the running game for jobs offered in the first three weeks.

**Waits on.** Nothing.

**Files.** src/core2/town-jobs-real-work.test.ts

**Notes.** Nov 16 04:00Z: red a second time, run beside day-zero and the wholesaler test on dfa99f94 (67.6 s), green alone a minute later on the same head; the seed of the red run is again lost, which is the defect.
