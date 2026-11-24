---
id: people-full-absence-above-cps
title: "Full people miss work in about one week in five, against CPS 3 to 4 percent"
area: people
kind: bug
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: sonnet
effort: medium
root: none
lead: lives
checked: fable 2026-11-10
---

**What.** Measured Oct 25 in a played year of Cleveland, Alabama (0115472, seed 9310ee1167fba09c): full people missed at least one planned day in 21.68 percent of work weeks, read from core.work.rollups, against CPS absence of 3.0 private and 4.2 public. The merger's source review found the 21.68 percent is job-weeks with any missed work segment, not the CPS measure (full-time wage and salary workers, under 35 hours for included reasons, vacation excluded), so the two are not comparable. Find which reasons in the attendance engine drive the misses once a comparable measure exists.

**Cause.** Needs cause. Looked at the item and the merger's note: the cited 21.68 percent is job-weeks with any missed segment (core.work.rollups, Cleveland, Alabama 0115472, seed 9310ee1167fba09c), not CPS Table 47's measure; src/core2/work-attendance.ts exists but was not traced.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: absence follows the worker's own health, household and job; real rates check totals only. One rule, all 56 places.

**Done when.** A second session builds a measure comparable to CPS (full-time wage-and-salary workers, main jobs, fewer than 35 hours for included reasons, vacation and holidays excluded), reports full-people absence on it in a drawn place of buildBenchWorld (place and seed named) beside the CPS figures in src/core2/residents-turnover-bands.test.ts, and names each reason driving the misses by record id.

**Waits on.** Nothing.

**Files.** src/core2/work-attendance.ts, src/core2/residents-turnover-bands.test.ts

**Notes.** TODO

Merger 0, Oct 26 source review: the cited 21.68 percent is job-weeks with any missed work segment, not the CPS absence measure. CPS Table 47 footnotes 1 and 2 select full-time wage-and-salary workers and main jobs, require fewer than 35 hours for included reasons, and exclude vacation and holidays (https://www.bls.gov/cps/cpsaat47.htm). Establish a comparable measure before attributing a CPS calibration gap; the historical diagnostic is retained, not treated as fivefold comparable evidence. PR #5796 labels the diagnostic explicitly and leaves research-residents-cadence-sourced open.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have brought full workers' missed-work weeks down to the CPS figure; the item's own measure was found not to be the CPS measure and no player sees a rate.
