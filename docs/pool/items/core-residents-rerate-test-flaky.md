---
id: core-residents-rerate-test-flaky
title: "residents.test.ts 're-rates full and counted workers' fails in some places on main (Foxborough, Massachusetts)"
area: core
kind: bug
priority: 3
size: S
status: in-pr
claimed-by:
pr: 4908
blocked-on:
source: added with npm run pool -- add
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Fixed Oct 17 (claude, PR 4908): not a flaky test. Foxborough, Massachusetts (key 2524855, seeds fx1 and fx2) pays some employers twice a month, which opens two wage flows (ids ending :0 and :1) that each list every job and pay half. `rerateCountedJobs`, `endCountedJob` and `addCountedJob` changed only the one flow `wageFlowByJob` names, so a counted raise or a new minimum wage reached half the pay, a counted hire was paid half, and a laid-off counted worker kept drawing half. They now change every flow of the job's payroll. In Foxborough 439 of 1,754 counted wage jobs were in two flows. The test `src/core2/counted-payroll-siblings.test.ts` draws places until one pays twice a month (Chappell, Nebraska, seed c33930a862165ec84423630e2660b9cd66bfd45b225dda7d9566800afcfd704f); it fails there without the fix.
