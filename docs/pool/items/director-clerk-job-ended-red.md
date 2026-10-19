---
id: director-clerk-job-ended-red
title: "civic-roles.test.ts fails on main: the town clerk's public job has ended while the appointment still names them (Towner, North Dakota, seed 8c6b6e7038c3dfca)"
area: director
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/pool-clerk-job-ended
pr: #4814
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T20:18:10.051Z
---

**What.** The test that the director fills the filing clerk from the filing office's records fails on main in some places: the town clerk's public job has an end date (2025-02-01 in Towner, North Dakota, seed 8c6b6e7038c3dfca; 2025-11-01 in Ringgold, Georgia, seed afe0e31bd21b2003) while the appointment record still names them. Find what ends the clerk's job, and either keep the job running while the appointment stands or end the appointment with the job. The test expects a live job on the town's payroll.

**Rules.** Ask why: the PR body names what ended the job, by job record id and date. Replace, never layer: fix the cause where it ends the job, not the test's expectation. One rule, all 56 places: the fix names no place.

**Done when.** src/director/civic-roles.test.ts passes with GOLDEN_PATH_SEED set to 8c6b6e7038c3dfca and afe0e31bd21b2003 and in drawn places and seeds the builder did not choose, and the PR body names the job record id and what ended it.

**Files.** src/director/civic-roles.test.ts, src/core2/modules/filing-clerk.ts, src/core2/modules/executive.ts

**Notes.** Reproduces on clean main with the first seed (checked Oct 16 while merging the law-reached scene branch).
