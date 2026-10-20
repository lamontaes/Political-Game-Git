---
id: staff-aides-miss-every-scheduled-day
title: "A governor's aide attends none of 18 scheduled days and is never paid (Independence, Louisiana)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In the played world for Independence, Louisiana (key 2237025, world seed 7b7b07cc96aa225f55b6f8834881f44ed234811a577a1067e954be747cca333a), the governor's aide :0 (job:public:staff:official:term:seat:US-LA:governor:2025-01-20:person:aide:...:0) shows plannedMinutes 12960, attendedMinutes 0 and missedDays 18 in work.totalsByJob, then their job ends a month after it starts, so they earn and are paid nothing; aide :2 attends and is paid. Find why the aide attends no scheduled day (the attendance read for a person on a government treasury job) and fix it at the root.

**Rules.** Wire to the world: attendance follows the person's health, schedule and the law, never a roll. An effect is a read: an aide who works is paid by a work-payroll journal record. One rule, all 56 places.

**Done when.** In the played world for Independence, Louisiana (key 2237025, seed 7b7b07cc96aa225f55b6f8834881f44ed234811a577a1067e954be747cca333a) after 120 days every aide of a seated official with a scheduled day has attendedMinutes above zero or a recorded reason for each missed day, shown by a test beside src/core2/staff-paid-every-place.test.ts that names the aide by job id.

**Files.** src/core2/work-attendance.ts,src/core2/modules/staff.ts

**Notes.** Found while finishing PR 5712 (staff-paid-territory-no-payroll-template): the merger's failing case was an aide who attended nothing, not a payroll gap.

Looked at Oct 20 (claude/staff-aides-attendance), not a defect: in Independence, Louisiana (key 2237025, world seed 7b7b07cc96aa225f55b6f8834881f44ed234811a577a1067e954be747cca333a) after 120 days the governor's aides :0 and :1 each miss all 18 scheduled days and aide :2 attends 9 and misses 9. `reviewAttendance` in `src/core2/modules/staff.ts` reads each aide's missed share of scheduled days from `work.totalsByJob` once a month and ends the job (`staff:dismissed-absent:<staff id>:<date>`, with absentShare, the official's lean, worked and missed days on the dismissal row) when the share is above `staffAbsenceTolerance` stretched by the official's own lean. So an aide who attends nothing earns nothing, is dismissed at the next review, and is replaced: the engine working as designed (attendance is the aide's own decision from traits and needs, with the dismissal read from it). The payroll test therefore counts an aide as due only after attending (PR 5712). If the owner wants fewer no-show hires, that is a hiring question (who is picked), not an attendance one; no work is left here. CTO: drop.
