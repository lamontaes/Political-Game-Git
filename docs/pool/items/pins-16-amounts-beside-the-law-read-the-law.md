---
id: pins-16-amounts-beside-the-law-read-the-law
title: "Amounts beside the law are the law in force, and thresholds real law indexes follow the world's own prices and wages"
area: laws
kind: bug
priority: 1
size: L
status: in-pr
standard: 2
claimed-by: laws-and-effects (builder crew, Nov 17)
pr:
after:
blocked-on:
lead: laws-effects
source: 'CTO, LIFT THE PINS, crew line #9747, Nov 17 03:10Z and 03:11Z, family 16 of 35; owner: "Everything comes from the simulation. Stop pegging things to real numbers."'
model: opus
effort: high
root: none
---

**What.** Amounts the law sets are read from data files, not from the law in force, so an act a body passes never moves what is paid: officials' salaries, the teacher minimum, the town job minimum wage, the paid leave premium, a local seat's pay and the federal debt limit. Thresholds real law indexes (the poverty thresholds and guideline, the income fifths, a Social Security award at claim) stay in one year's dollars forever. Seen: a legislature's pay act, written through `enactLaw`, leaves every legislator's pay where it was.

**Cause.** Found in code: `officialSalary` (src/core2/modules/official-pay.ts) reads official-salaries-2026.json; `teacherFloor` (src/core2/public-pay-floor.ts) reads teacherMinimumSalaryDollars; `townJobRate` (src/core2/town-pay.ts) defaults to the generated minimum-wage table; `paidLeaveProgram` (src/core2/paid-leave.ts) reads paidLeavePremiumShare; `seatPay` (src/core2/office-day-pay.ts) reads the research band; `debtLimitMinor` (src/core2/budgets-treasury.ts) reads the file's debtLimit. `povertyThresholdMinor`, `povertyLineDollars`, `incomeBandOf` and the claim award read fixed-year dollars.

**Fix.** Each amount reads its law row in force at its own level (`official-salary:<office>`, `teacher-minimum-salary`, `minimum-wage`, `paid-leave-premium`, `local-official-pay:<row>`, `debt-limit`), re-read on every payday; until History's century enacts day one's rows, the opening figure stands under a registered stopgap naming it. Indexed thresholds follow `taxIndexOf` from the world's opening year. Every engine reads one income fifth through `incomeBandOn`. The day-one statute rows (the property tax fallback and opening rows, the local sales tax average, the sales tax base, the property tax cap share, and the fuel tax a mileage fee refunds, which the goods table keeps as one federal-and-state figure) are History's seam (its pull request 5).

**Time box.** 6 hours for one Opus session at high effort, with one Sonnet helper for the indexed thresholds.

**Rules.** Everything comes from the simulation: no amount is set from a real figure after day one. An effect is a read: the engine that pays reads the law row the body enacted.

**Done when.** A second session, in a drawn place, Town, State (seed printed), enacts a state legislators' pay act in dev mode and reads the next payday's paycheck at the enacted salary; and `src/core2/official-salary-law.test.ts`, `src/core2/teacher-floor-amount-law.test.ts` and `src/core2/amounts-read-the-law.test.ts` pass in that drawn place.

**Waits on.** Nothing.

**Files.** src/core2/modules/official-pay.ts, src/core2/public-pay-floor.ts, src/core2/town-pay.ts, src/core2/wage-floor.ts, src/core2/modules/jobs.ts, src/core2/coarse-place.ts, src/core2/population.ts, src/core2/paid-leave.ts, src/core2/office-day-pay.ts, src/core2/modules/office-day.ts, src/core2/budgets-treasury.ts, src/core2/modules/laws.ts, src/core2/reference/town-pay.generated.ts, src/core2/data/stopgaps/laws.json, the eight readers of the income fifth, and the four new tests (`thresholds-follow-the-world.test.ts` too)
