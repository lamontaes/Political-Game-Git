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

**What.** Payroll pays a job's hourly rate for the minutes its work schedule runs, but the opening's full-time jobs all stated 40 hours a week while their schedules ran 40, 42.5, 45 or 48 hours, so a job's stated pay and the pay it received differed by up to 20 percent (Good Hope, Illinois: ratios of 0.98, 1.06, 1.12, 1.13 and 1.20 among 22 jobs). The hourly rate is the occupation's market rate, and full-time workers average 42 to 43 hours a week (BLS), so the schedule is the right week and the stated hours were wrong. A job now states the week its schedule runs and the daily pay of that week at the same hourly rate; a hire that copies a schedule states the copied week. A government post's stated pay is for a full-time week (40 hours), so its hourly rate is still set over the scheduled minutes.

**Rules.** Estimate, never UNKNOWN: the hourly rate keeps its occupation source and the hours are the recorded schedule's. Wire to the world: payroll, the job row and the budget line read the same pay. One rule, all 56 places: nothing names a place.

**Done when.** In the played world (`buildBenchWorld`, a drawn place and seed named in the test output) every open job's annual pay over its scheduled minutes is within 2 percent of the pay its row states, at the opening and after 120 days of hires and raises, shown by job id, and `src/core2/opening-schedule-pay.test.ts` holds it.

**Files.** src/core2/population.ts, src/core2/public-payroll.ts, src/core2/modules/jobs.ts, src/core2/opening-schedule-pay.test.ts

**Notes.** Found while fixing the press outlets' wage gap, Oct 17. Settled Oct 18 (claude/opening-schedule-hours): payroll amounts do not change for the opening's jobs, only the hours and daily pay the rows state. Counted workers hired from a counted template are not changed (`hireCounted` copies the template row).
