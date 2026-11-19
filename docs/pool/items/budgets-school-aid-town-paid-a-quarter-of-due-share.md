---
id: budgets-school-aid-town-paid-a-quarter-of-due-share
title: "A town gets about a quarter of its due share of state school aid while the state's line pays most of what fell due"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: opus
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** In the state school-aid case (`src/core2/law-reach/school-aid.test.ts`), the state's treasury pays the local-aid line pro rata when its money falls short (`scale = min(1, have / need)`, `src/core2/budgets-treasury.ts` around line 1843). Over 360 days at Houlton, Maine (2333945), seed 6893b3e8, with the school-aid law against without it: the line fell due 35,778,821,726 cents and paid 21,331,857,911 (59.6 percent; 37,653,112 to governments, 21,294,204,799 outside; providers' share not counted). The town's share of the pool is 0.4157 percent, so a pro rata payment would send it about 88,670,836 cents; it received 37,653,112, about a quarter of its due share (about 148.7 million cents due).

Guards: the state school-aid law's reach on a town's Aid from other governments line and its schools line, on the Budgets screen.

**Cause.** Measured: Houlton, seed 6893b3e8 on train `9e93182313`, numbers above, from the test's own printed lines. Not yet traced: either the aid part of the line is prorated harder than the outside part, or the town's share shrinks in the second budget year, or the scale varies by month so the months with the most aid due have the smallest scale. The first needs per-month rows of `treasuryMonthsOf(api, stateGovernmentId)` (due, aid, providers, outside, short per month) next to the town's `aidReceivedMinor` per month.

**Fix.** Print the month-by-month rows for the state's `localAid` line and the town's receipts over the 360 days. If the aid portion is paid last or shorted more than the outside portion, pay every payee on the line the same fraction of what it was due, in the same month. If the shortfall is the same across payees, the town's share changed in year two: say what moved it. Keep the school-aid test's relationship checks (the town's receipts equal the line's `aid` paid, never more than the town's share of due).

**Time box.** 3 hours

**Rules.** Wire to the world: the state's cash, the aid line and the town's revenue are the same journal. Ask why: each month's due, paid and short, by record.

**Done when.** A second session runs `src/core2/law-reach/school-aid.test.ts` at two fresh seeds, each in its drawn place named in the test's output, and, for each, the town's extra receipts over the window equal its due share times the fraction the state paid of the line, within the rounding of one payment per month.

**Waits on.** Nothing.

**Files.** src/core2/budgets-treasury.ts, src/core2/law-reach/school-aid.test.ts
