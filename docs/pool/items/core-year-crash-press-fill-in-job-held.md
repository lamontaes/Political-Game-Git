---
id: core-year-crash-press-fill-in-job-held
title: "A played year stops: a counted press staffer holding a job is relocated while being filled in"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4768
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A played year stops with "Invalid relocation: one living household, no job held". `refreshPressStaff` in `src/core2/modules/press.ts` (about line 2278), run by `pressWeek`, calls `fillInPerson` for a counted press staffer who holds a counted job. The fill-in relocates the household (`relocatePeopleV1` in `src/core2/state.ts`), which refuses anyone who holds a job. In Old Brownsboro Place, Kentucky, with seed 300decacbc29c0d7fdb7f40852bfacecca6cd3bb (the election night test in src/director/electoral-scenes.test.ts), the year stopped at the first advance. Find which staffer held the job and why the fill-in relocated a household whose member kept it, and fix the fill-in so a filled-in worker keeps their job without a relocation.

**Rules.** An effect is a read: the fix keeps the worker's job record and their pay. One model, two tiers: a counted worker filled in is the same person with the same job. Every dollar balances on the journal.

**Done when.** In a one-year run of the played world (buildBenchWorld) in Old Brownsboro Place, Kentucky with seed 300decacbc29c0d7fdb7f40852bfacecca6cd3bb, the year completes, the press staffer is a full person who still holds the same job id, and a test in src/core2/ names the staffer and the job.

**Files.** src/core2/state.ts, src/core2/modules/press.ts, src/core2/modules/residents.ts

**Notes.** Found while merging main into the director civic producers branch (PR 4606). Related to core-year-crash-press-staff-absent-person, a different failure in the same fill-in call.

**What.** A played year stops with "Invalid relocation: one living household, no job held" when a counted person who holds a job is brought back from the counts (filled in) and `relocatePeopleV1` in `src/core2/state.ts` refuses to move someone with an active job, though they are returning to the place they already live. The press staff are the case: they hold a press job as counted people. Allow the return when the job stays in the place the person is coming back to, and keep refusing a person who would leave a job behind by moving to another place.

**Rules.** Replace, never layer. One model, two tiers: a counted person who holds a job comes back with it. One rule, all 56 places.

**Done when.** In a played two-year world in a drawn place with the seed named in the PR body, a counted press staffer who holds a job is filled in without the crash and keeps the job by record id, and a test beside `src/core2/state.test.ts` shows both the allowed return and the refused move.

**Files.** src/core2/state.ts

**Notes.** The fix is already written on the press-turnover branch (PR #4596, `row.placeId.replace(/^counted:/, "") !== input.placeId` in the job check of `relocatePeopleV1`); take it from there when that merges, or lift just that hunk with a test. I could not reproduce the crash on main in five drawn two-year runs (Mohall ND, Lakeside OR, Edison WA, Iona ID, Chums Corner MI): it needs the press turnover that hires counted staff into jobs.

Sent back 2026-10-16 from PR #4729 (branch claude/pool-notes-oct16b): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4729 (branch claude/pool-notes-oct16b): Merging current main into claude/pool-notes-oct16b conflicts in docs/pool/items/core-disasters-ss-prices.md, docs/pool/items/core-fill-in-hook.md, docs/pool/items/core-fill-in-returning-household-absent-member.md, docs/pool/items/core-year-crash-press-fill-in-job-held.md, docs/pool/items/director-narrator-situation-leads.md. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4768 (branch claude/core-press-fill-in-job-held): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
