---
id: world-jobs-full-leave-strain-red
title: "jobs-full-leave.test.ts fails on main: a leaving worker has no strain property (place 3336580)"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/jobs-full-leave-red
pr: #4858
blocked-on:
source: found in #4852, Oct 17
claimed-at: 2026-10-17T02:09:41.626Z
---

**What.** `src/core2/jobs-full-leave.test.ts` ("at least one full person with a job leaves work or retires for a recorded reason") fails with `JOBS_LEAVE_SEED=6af7cd6a27c66dc0` (place 3336580): the recorded reason it reads, `{ age: 65.8, ... }`, has no `strain` property. Find which reason row the jobs engine wrote for that leaver and whether the test or the writer is wrong.

**Rules.** No dice: a worker leaves for a reason in the records, and the row names it. One rule for all 56 places.

**Done when.** The test passes with that seed and place and in a handful of other drawn places, and the PR body names the leaver and the reason row by record id.

**Files.** src/core2/jobs-full-leave.test.ts, src/core2/modules/jobs.ts

**Notes.** Fails the same way on main without the counted-reads change in #4852.
