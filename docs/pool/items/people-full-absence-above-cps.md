---
id: people-full-absence-above-cps
title: "Full people miss work in about one week in five, against CPS 3 to 4 percent"
area: people
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Measured Oct 25 in PR #5796's played year (Cleveland, Alabama 0115472, seed 9310ee1167fba09c): full people missed at least one planned day in 21.68 percent of work weeks, read from core.work.rollups, against CPS absence 3.0 private and 4.2 public (data/research/people/jolts-cps-turnover-absence-2025.json). Find which reasons in the attendance engine drive the misses and whether they match what CPS counts.

**Rules.** No dice: absence follows the worker's own health, household and job; real rates check totals only. One rule, all 56 places.

**Done when.** src/core2/residents-turnover-bands.test.ts in a drawn place reports full-people absence within the CPS industry spread, or the PR names each remaining reason by record.

**Files.** src/core2/work-attendance.ts,src/core2/residents-turnover-bands.test.ts

**Notes.** TODO

Merger 0, Oct 26 source review: the cited 21.68 percent is job-weeks with any missed work segment, not the CPS absence measure. CPS Table 47 footnotes 1 and 2 select full-time wage-and-salary workers and main jobs, require fewer than 35 hours for included reasons, and exclude vacation and holidays (https://www.bls.gov/cps/cpsaat47.htm). Establish a comparable measure before attributing a CPS calibration gap; the historical diagnostic is retained, not treated as fivefold comparable evidence. PR #5796 labels the diagnostic explicitly and leaves research-residents-cadence-sourced open.
