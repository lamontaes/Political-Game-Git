---
id: core-year-crash-press-fill-in-job-held
title: "A played year stops: a counted press staffer holding a job is relocated while being filled in"
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

**What.** A played year stops with "Invalid relocation: one living household, no job held". `refreshPressStaff` in `src/core2/modules/press.ts` (about line 2278), run by `pressWeek`, calls `fillInPerson` for a counted press staffer who holds a counted job. The fill-in relocates the household (`relocatePeopleV1` in `src/core2/state.ts`), which refuses anyone who holds a job. In Old Brownsboro Place, Kentucky, with seed 300decacbc29c0d7fdb7f40852bfacecca6cd3bb (the election night test in src/director/electoral-scenes.test.ts), the year stopped at the first advance. Find which staffer held the job and why the fill-in relocated a household whose member kept it, and fix the fill-in so a filled-in worker keeps their job without a relocation.

**Rules.** An effect is a read: the fix keeps the worker's job record and their pay. One model, two tiers: a counted worker filled in is the same person with the same job. Every dollar balances on the journal.

**Done when.** In a one-year run of the played world (buildBenchWorld) in Old Brownsboro Place, Kentucky with seed 300decacbc29c0d7fdb7f40852bfacecca6cd3bb, the year completes, the press staffer is a full person who still holds the same job id, and a test in src/core2/ names the staffer and the job.

**Files.** src/core2/state.ts, src/core2/modules/press.ts, src/core2/modules/residents.ts

**Notes.** Found while merging main into the director civic producers branch (PR 4606). Related to core-year-crash-press-staff-absent-person, a different failure in the same fill-in call.
