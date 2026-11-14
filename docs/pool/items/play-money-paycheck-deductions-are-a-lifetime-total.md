---
id: play-money-paycheck-deductions-are-a-lifetime-total
title: "Money's paycheck deductions add up every paycheck since the game began, shown beside last month"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: rc2-done-from-records
source: "Playtester P3, Nov 13, 2026 (crew line #8928)"
checked:
claimed-at:
---

**What.** On Jan 9, 2026, Money shows 'Last month · $799', and beside it 'Paycheck deductions: Federal social security $872.91, Federal medicare $204.13, Federal income $138.48, State income $240.65'. Those four numbers are the totals for every paycheck since the life began on Jan 20, 2025, nearly a year of a part-time cashier's pay. Nothing says so. Read beside 'Last month', a monthly $872.91 of Social Security means about $14,000 of pay a month, while the same screen shows $799 in cash and $451.94 of everyday living left unpaid. The totals grow every payday for as long as the game runs. Seen: Money and property, Paycheck deductions.

**Cause.** Found in code: budgetView in src/bench/budget.ts (line 237) sums `withholdingOf(api, personId)` into `byLine` over every row the person has. It never looks at a row's `date` or `periodDays`, and play.mjs (line 3556, the deductions strip) prints that sum under the label 'Paycheck deductions' with no period. Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89. The four totals are 6.2, 1.45 and about 1 and 1.7 percent of about $14,080, which is a year of the player's pay (Playtester P3, Nov 13, 2026).

**Fix.** Sum only the withholding rows dated in the same month as the 'Last month' strip, which is the month the spending column reads, so the deductions and the spending cover one period. Put that month's gross pay (the rows' `paidMinor`) at the top of the strip, so the player sees pay coming in, which Money shows nowhere today. Any new label comes from the Words session through src/bench/data/controls.json.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Every figure is a record's own, traceable to its withholding row ids. No hand-written player text: labels come from controls.json and pass the words bar. One rule, all 56 places.

**Done when.** A second session plays a working player in a drawn place, named with its seed, past two paydays in the same month on main. Money's deduction rows then equal that month's withholding rows (by id, in dev Trace), not the year's, and the month's pay is shown. A bench test fails with main's sum over every row.

**Waits on.** Nothing.

**Files.** src/bench/budget.ts, src/bench/play.mjs, src/bench/data/controls.json
