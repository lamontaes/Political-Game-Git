---
id: world-press-staff-same-day-exit
title: "Ten press staff in one town leave on the same day, December 7, 2026, all marked left-work"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "gov-stopgap-press-faked-mechanic, PR #4596"
---

**What.** In a played year in Center Moriches, New York (seed s2), ten of an area's press staff, heads and reporters across the outlets, left on the same day, December 7, 2026, each recorded as left-work. A whole group quitting on one date looks like a data artifact, such as jobs created with an end date or a payroll step ending them together, not a cause. Find what ends those jobs on that date and make each departure follow its own cause.

**Rules.** No dice: a job ends from a cause record (a quit, a layoff, a closure, a death), never a shared date. The chain is the acceptance: follow one departing reporter from the cause to the job's end. Ask why: the reason a person left is answered by record.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, press staff departures are spread over the year by their causes and no more than a few share a date unless one cause record names them, and a test in src/core2/press-turnover.test.ts or jobs tests states it. The owner plays it: reads the paper's staff list through the year and sees people leave one at a time.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/press.ts, src/core2/press-staff.ts

**Notes.** Found by the staff-turnover proof in PR #4596 (staff rows with leftOn 2026-12-07 and leftBecause left-work). Not yet traced whether it is a jobs-engine date or the press staff's job records.
