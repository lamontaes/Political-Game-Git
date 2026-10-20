---
id: world-opening-schedules-run-over-job-hours
title: "A full-time job's opening schedule runs 40 to 48 hours a week against its stated 40, so payroll pays up to 20 percent over the job's pay"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/opening-schedule-hours
pr: #5027
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T01:13:29.572Z
---

**What.** Payroll pays a job's hourly rate for the minutes its work commitment schedules (`work-payroll`), but the opening's full-time jobs all state 40 hours a week (`hoursDaily` 5.714) while their schedules run 40, 42.5, 45 or 48 hours. In Cobb Island, Maryland (place 2418200, seed all56, `buildBenchWorld`) the 29 jobs that have a commitment show a schedule-to-stated ratio of 1.0 for 6 (a cashier, a dishwasher, servers and two teachers, all at 2,400 minutes), 1.063 for 6 (2,550: a construction laborer, janitor, maintenance worker, postal clerk and sales associate), 1.125 for 2 (2,700: county clerk, union representative), 1.2 for 9 (2,880: editors and reporters at the local press, a state board of elections post, campaign and community organizers), 0.978 for 4 (part-time, 1,320 against 1,350 minutes) and 0.9 for 2 dispatchers (2,160). The hourly rate comes from the stated hours, so a job on a 48-hour schedule pays 20 percent over its pay row. The press staff are fixed by `public-post-pay-matches-schedule` (hourly rate set over the scheduled minutes in `startPublicJob`); the other jobs, supplied by `suppliedSchedules` in `src/core2/modules/work.ts`, are not. Decide which is right: if the schedule is the recorded week, the stated hours and the hourly rate (annual pay over the scheduled hours) should follow it; if the stated hours are, the supplied schedules should be cut to them.

**Rules.** Estimate, never UNKNOWN: a job's hours and its pay start from the occupation's real average, marked with the source. Wire to the world: payroll, budgets and the director read the same pay. One rule, all 56 places.

**Done when.** In the played world (`buildBenchWorld`, the drawn place Cobb Island with seed all56 and one random place) every job's annual pay over its scheduled minutes is within 2 percent of its stated annual pay, shown by job id, and a test in `src/core2/` names the place and seed; the printed table of ratios above is all 1.0.

**Files.** src/core2/modules/work.ts, src/core2/opening-work.ts, src/core2/opening-employment.ts

**Notes.** Found while fixing the press outlets' wage gap, Oct 17 (claude). Ratios were counted over `core.work.commitments` against `job.hoursDaily` times 7 times 60.
