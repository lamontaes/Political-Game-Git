---
id: core-played-days-after-results-mode-lose-a-payroll-retry
title: 'Playing on after skipped months stops on a full worker''s payroll retry: "Payroll arrears lost their actual recorded retry membership" (Fairmount, North Dakota)'
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: opus
effort: medium
root: none
source: Opus fixer for Fable A, Nov 12, 2026, while writing the test for core-results-catch-up-reuses-a-savings-draw-id
---

**What.** A world that plays some days, skips a month or more in results mode, and then plays again stops on its first played days with "Payroll arrears lost their actual recorded retry membership." (`ownedRequest`, src/core2/work-payroll-dispatch.ts line 198, from `dispatchStatus` line 313 and `runWorkPayrollDay` line 424, the work module's day). Dev mode's skip of a year (src/bench/dev-mode.ts, line 1791) is results mode, and play goes on after it. Seen: after dev mode's year skip, the next played day stops with that error instead of showing the town.

**Cause.** Measured: Fairmount, North Dakota (place 3825300), world seed 6e04537f49b3c068d5336be3473e26d99bc02f8a670be5b6bdadc2e62104ca36, drawn by `drawPlace("fx8886a1", "results-mode-savings-draw-per-payday")`. Play 45 days from the game's start with `advanceCore`, then results mode to the first of the month two months on, then play 45 days again: the throw comes inside that second played stretch, on clean main 33e38d44bc as well as with the savings-draw fix. Not yet traced to a line. The likely route, read in the code and not proved: results mode runs no module's day, so the work module's payroll (`runWorkPayrollDay`) does not run on skipped days. A full worker's unpaid pay waits in `payrollArrearsByDue` under a retry day. When that day is skipped, the guard at line 196 later looks for the retry under a date where it was never filed, because `nextWorkPayrollPeriod` counts from `lastSettledAt`. The cause find prints, for the payee that throws, `lastSettledAt`, the retry dates it is filed under, and the date the guard expects.

**Fix.** Once the cause is printed: when results mode ends (or on the first played day after it), carry each pending payroll retry to the day the guard will look for it, or settle it, through the payroll's own writer, and keep the guard as it is. One path, no new daily scan.

**Time box.** 2 hours

**Rules.** Never loosen or remove the guard. No dice; no place named in code. Speed: no scan of the whole world every day.

**Done when.** A second session, on main in a drawn place, plays 45 days, skips two months in results mode and plays 45 more days with no throw, naming the place and seed, and does the same in dev mode with the year skip followed by a played week.

**Waits on.** Nothing

**Files.** src/core2/work-payroll-dispatch.ts, src/core2/work-payroll-cash.ts, src/core2/life.ts, src/bench/dev-mode.ts

**Notes.** Found on Nov 12, 2026, while writing the drawn-place test for core-results-catch-up-reuses-a-savings-draw-id. That test now plays one year and then only skips, so it does not cross this defect.
