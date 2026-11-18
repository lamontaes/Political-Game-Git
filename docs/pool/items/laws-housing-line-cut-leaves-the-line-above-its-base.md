---
id: laws-housing-line-cut-leaves-the-line-above-its-base
title: "A cut to a government's housing line, made after its fiscal year turned over, leaves the line above its base and the help still paid"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9255
blocked-on:
source: found by fixer F6 while pinning the housing family test (Nov 14)
after:
lead: laws-effects
model: opus
effort: medium
root: none
---

**What.** The housing family test's case "rent help: cutting the housing line ends every payment" fails at Whitney, Nevada (3283800, seed `housing-pin-1`), Southern Pines, North Carolina (3763120) and Fort Carson, Colorado (0827370): "this government paid assistance after its line was cut". A player who cuts a housing line sees rent help go on being paid. Seen: the Journal's rent assistance lines and the government's budget screen at Whitney keep showing the cut line's money after the cut.

**Cause.** Found in code: `src/core2/modules/budgets.ts`, the readers that asked how far a line stood above its Census base (rent help, school aid, the budget-line measures, the defense and deficit measures, Social Security) subtracted `baseBudget(...)`, which leaves out `receiptsFactor`, the scaling `legislatedBudget` applies to state and county spending (last fiscal year's receipts over the plan's). A line cut to what looked like its base was still above the true base by that factor, and where the factor was below 1 the raise was hidden. Measured: with `npx vitest run src/core2/budget-line-extra.test.ts` at Whitney, Nevada (3283800, seed `housing-pin-1`) the county's extra reads its enacted changes after a raise, and a cut by the extra gives extra 0 and no help paid in the next 32 days; at Fort Carson, Colorado (0827370, same seed) the raise shows and the cut ends the help.

**Fix.** One function, `lineExtra` (the line minus `lineWithoutBills`), in `modules/budgets.ts`; each budget row stores the `receiptsFactor` it was written with; the six readers and the guard `tests/guards/line-extra.test.ts` (fails if a non-test file subtracts `baseBudget` again). Year 1 at Whitney, Southern Pines (3763120) and Fort Carson with and without it: rent help paid, payments, and the measures are identical (342,620 in 7 payments; 2,627,940 in 34; 297,510 in 7), because no bill changed a line in an unattended year. The change shows only after a bill or a carried amendment.

**Time box.** 2 hours.

**Rules.** An effect is a read, not a record: the payer reads the line on the day it pays. No dice.

**Done when.** At three pinned places, each a drawn place named with its seed, the housing family test's cut case passes without being skipped, and a second session sees it in the running game: it cuts a raised housing line at a place and date after the fiscal year turned, and reads the Journal for no rent assistance from that line afterward.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts, src/core2/housing-assistance.ts, src/core2/law-wiring-housing.test.ts
