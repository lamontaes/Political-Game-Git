---
id: core-speed-pay-period-boundaries
title: "Payroll boundary dates are kept once computed, not rebuilt for every worker and payday"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/speed-pay-period
pr: #5385
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:40:09.097Z
---

**What.** A profile of a played year in Discovery Harbor, Hawaii (seed m7a) put monthBoundary in work-pay-period.ts first among the named functions at 3.5 percent of the year. It built Date objects for every worker and payday. The boundary is a pure function of the calendar, so it is kept once computed.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower; Replace, never layer: the repeated build is removed where it happens, in the function itself.

**Done when.** npm run speed:year on seed m7a and the payroll tests in src/core2/work-pay-period.test.ts pass with monthBoundary below 1 percent of a fresh profile, shown in the PR body.

**Files.** src/core2/work-pay-period.ts

**Notes.** TODO
