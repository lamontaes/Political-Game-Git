---
id: core-speed-school-day-memo
title: "Whether a date is a school day is worked out once, not for every person every day"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/speed-school-day-memo
pr: #5389
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:36:58.589Z
---

**What.** A profile of a played year in Discovery Harbour, Hawaii (seed m7a) shows onHoliday in modules/school.ts at 0.7 seconds of self time, 1.5 percent of the year. isSchoolDay is a pure function of the date, yet due() calls it for every person each day, rebuilding Date objects for each holiday row.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower; Replace, never layer: the repeated work is removed in isSchoolDay itself, not hidden behind a second wrapper.

**Done when.** A fresh profile of npm run speed:year on seed m7a shows onHoliday under 0.2 percent of the year, and the school day tests in src/core2/school.test.ts pass, shown in the PR body.

**Files.** src/core2/modules/school.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5389 (branch claude/speed-school-day): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.
