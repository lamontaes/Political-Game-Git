---
id: staff-aides-miss-every-scheduled-day
title: "A governor's aide attends none of 18 scheduled days and is never paid (Independence, Louisiana)"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/staff-aides-attendance
pr: #5762
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T23:18:17.230Z
---

**What.** In the played world for Independence, Louisiana (key 2237025, world seed 7b7b07cc96aa225f55b6f8834881f44ed234811a577a1067e954be747cca333a), the governor's aide :0 (job:public:staff:official:term:seat:US-LA:governor:2025-01-20:person:aide:...:0) shows plannedMinutes 12960, attendedMinutes 0 and missedDays 18 in work.totalsByJob, then their job ends a month after it starts, so they earn and are paid nothing; aide :2 attends and is paid. Find why the aide attends no scheduled day (the attendance read for a person on a government treasury job) and fix it at the root.

**Rules.** Wire to the world: attendance follows the person's health, schedule and the law, never a roll. An effect is a read: an aide who works is paid by a work-payroll journal record. One rule, all 56 places.

**Done when.** In the played world for Independence, Louisiana (key 2237025, seed 7b7b07cc96aa225f55b6f8834881f44ed234811a577a1067e954be747cca333a) after 120 days every aide of a seated official with a scheduled day has attendedMinutes above zero or a recorded reason for each missed day, shown by a test beside src/core2/staff-paid-every-place.test.ts that names the aide by job id.

**Files.** src/core2/work-attendance.ts,src/core2/modules/staff.ts

**Notes.** Found while finishing PR 5712 (staff-paid-territory-no-payroll-template): the merger's failing case was an aide who attended nothing, not a payroll gap.
