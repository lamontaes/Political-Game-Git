---
id: core-speed-payday-withholding-in-play
title: "A payday's withholding and employer share do in play only what play reads (Long Hill: about 3 s of the year)"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** After the payroll settlement stopped preparing each payday twice, the largest parts of a payday outside the cash journal are the withholding (withholdPay and withhold in budgets.ts, about 2 s of Long Hill's year in the paired CPU profile) and the employer's share (payEmployerShare in employer-taxes.ts, about 1 s). Each builds a FinancePlanningSession per call, with its read guards and cash planner, and re-reads the law in force and the place's records for every worker on every payday. Keep every check under the bookkeeping switch and build only what the posting reads in play.

**Rules.** Bookkeeping is a debug switch: validation, copies and read guards run in tests and the bench, not in play. No dice: every dollar withheld and every employer share stays exactly the same. Speed: no change makes a year slower, measured before and after on the same machine.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, and a place drawn from all 56 for three years) the deep fingerprint is identical before and after on the same base; withholdPay's and payEmployerShare's inclusive time in a CPU profile of the paired year falls by at least half; the budgets, withholding, employer-taxes and payroll tests pass.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/employer-taxes.ts

**Notes.** Filed Oct 24 by the speed lead from the work helper's profile of core-speed-work-payroll-in-play. The laws lead's taxes family changes budgets.ts; take this after those PRs land or build on their branch.
