---
id: staff-aides-miss-every-scheduled-day
title: "A governor's aide attends none of 18 scheduled days and is never paid (Independence, Louisiana)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5762
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In the played world for Independence, Louisiana (key 2237025, world seed 7b7b07cc96aa225f55b6f8834881f44ed234811a577a1067e954be747cca333a), the governor's aide :0 (job:public:staff:official:term:seat:US-LA:governor:2025-01-20:person:aide:...:0) shows plannedMinutes 12960, attendedMinutes 0 and missedDays 18 in work.totalsByJob, then their job ends a month after it starts, so they earn and are paid nothing; aide :2 attends and is paid. Find why the aide attends no scheduled day (the attendance read for a person on a government treasury job) and fix it at the root.

**Rules.** Wire to the world: attendance follows the person's health, schedule and the law, never a roll. An effect is a read: an aide who works is paid by a work-payroll journal record. One rule, all 56 places.

**Done when.** In the played world for Independence, Louisiana (key 2237025, seed 7b7b07cc96aa225f55b6f8834881f44ed234811a577a1067e954be747cca333a) after 120 days every aide of a seated official with a scheduled day has attendedMinutes above zero or a recorded reason for each missed day, shown by a test beside src/core2/staff-paid-every-place.test.ts that names the aide by job id.

**Files.** src/core2/work-attendance.ts,src/core2/modules/staff.ts

**Notes.** Found while finishing PR 5712 (staff-paid-territory-no-payroll-template): the merger's failing case was an aide who attended nothing, not a payroll gap.

Sent back 2026-10-20 from PR #5762 (branch claude/staff-aides-attendance): The item already records that the job ends after a month. reviewAttendance dismissing the aide is the consequence of missing work, not the reason they missed all 18 scheduled days. Done when requires every scheduled aide to have attended time or a recorded reason for each missed day, shown by a test beside staff-paid-every-place.test.ts naming the full job id. This PR adds only aggregate totals and a dismissal description; no per-day reason records or that named test are supplied. Keep the finding, but do not mark the attendance question complete or ask to drop it until the required daily cause evidence and regression are present.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5762 (branch claude/staff-aides-attendance): Drawn-place test can pass with no scheduled attendance records because it only checks aides length and ignores checkCauses count; require nonempty scheduled job/day coverage; finish on that branch, merge main into it first.
