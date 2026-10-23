---
id: world-opening-city-administrator-shift-pattern
title: "A town's city administrator has a 24-hour slot every third day, and every state and federal post copies it (Independence, Louisiana)"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/admin-shift-pattern
pr: #5769
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T01:11:12.858Z
---

**What.** In the played world for Independence, Louisiana (key 2237025, world seed 7b7b07cc96aa225f55b6f8834881f44ed234811a577a1067e954be747cca333a) the city administrator's job job:public:town:city-administrator:person_0175403c4394037f has one 1,440-minute slot starting at 08:00 every third day (expectedWeeklyMinutes 3,360), the firefighters' cycle pattern in src/core2/work-patterns.ts. Every post GOV starts later copies the longest-hours job where its employer sits, and in this town that is the administrator's, so the governor's aides, the agriculture commissioner and the state budget post all get a day that crosses midnight as 960 and 480 minutes and that the person cannot attend. Find why the opening gives a city administrator the fire pattern (the workplace and title tables in src/core2/work-schedules.ts and the opening in src/core2/opening-work.ts) and give an administrator an office week.

**Rules.** One rule, all 56 places: the pattern follows the job's workplace and title in data, never a town named in logic. Wire to the world: the schedule is read by attendance the day it is used, so a job's pattern is checked in a played world, not on a fixture.

**Done when.** In the played world for Independence, Louisiana (key 2237025, seed 7b7b07cc96aa225f55b6f8834881f44ed234811a577a1067e954be747cca333a) after 120 days the city administrator's commitment has no slot longer than a working day, the governor's aides attend at least one scheduled day, and in two other places drawn from all 56 no public staff job has a slot over 12 hours, shown by a test beside src/core2/staff-aide-attendance-cause.test.ts naming each job id.

**Files.** src/core2/work-schedules.ts,src/core2/opening-work.ts,src/core2/work-patterns.ts

**Notes.** Found while finding the cause for staff-aides-miss-every-scheduled-day (PR 5762).
