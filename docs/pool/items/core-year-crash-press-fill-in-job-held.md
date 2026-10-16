---
id: core-year-crash-press-fill-in-job-held
title: "A played year stops: a counted press staffer holding a job is relocated while being filled in"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/core-press-fill-in-job-held
pr: #4768
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T15:58:51.934Z
---

**What.** A played year stops with "Invalid relocation: one living household, no job held" when a counted person who holds a job is brought back from the counts (filled in) and `relocatePeopleV1` in `src/core2/state.ts` refuses to move someone with an active job, though they are returning to the place they already live. The press staff are the case: they hold a press job as counted people. Allow the return when the job stays in the place the person is coming back to, and keep refusing a person who would leave a job behind by moving to another place.

**Rules.** Replace, never layer. One model, two tiers: a counted person who holds a job comes back with it. One rule, all 56 places.

**Done when.** In a played two-year world in a drawn place with the seed named in the PR body, a counted press staffer who holds a job is filled in without the crash and keeps the job by record id, and a test beside `src/core2/state.test.ts` shows both the allowed return and the refused move.

**Files.** src/core2/state.ts

**Notes.** The fix is already written on the press-turnover branch (PR #4596, `row.placeId.replace(/^counted:/, "") !== input.placeId` in the job check of `relocatePeopleV1`); take it from there when that merges, or lift just that hunk with a test. I could not reproduce the crash on main in five drawn two-year runs (Mohall ND, Lakeside OR, Edison WA, Iona ID, Chums Corner MI): it needs the press turnover that hires counted staff into jobs.

Sent back 2026-10-16 from PR #4729 (branch claude/pool-notes-oct16b): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
