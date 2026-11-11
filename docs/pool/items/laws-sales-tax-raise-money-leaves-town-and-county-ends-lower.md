---
id: laws-sales-tax-raise-money-leaves-town-and-county-ends-lower
title: "A sales tax raise takes $277,900 from businesses, $283,600 leaves town, and the county that raised it ends $7,700 lower (Marion, Mississippi; LaGrange, Wyoming)"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "Every law in dev mode's list, tried at four bodies")
model: opus
effort: high
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** A sales tax raise falls on businesses, most of the money leaves town, and the government that raised it gains little or loses. Measured in the law sweep in Marion, Mississippi (seed 7df73e53cd67), against a twin world with no bill. The town board added 10.59 points: businesses ended $277,900 lower and households $24,100 lower, governments gained $19,600, and $283,600 was recorded as leaving to the outside. When the county board passed the same raise, governments ended $7,700 lower. The sweep ran 120 days for local bodies. In LaGrange, Wyoming (seed 63355aee286d) the result held: businesses ended $80,000 lower, households $400 lower, and $72,000 left town. The audit did not trace whether shoppers went elsewhere or the tax was paid outward, and it lists the county result among those that point the wrong way. Trace the tax by the payments' own labels from the till to the treasury, and fix it at the cause for every government that levies a sales tax: the tax collected on sales in the place is paid to the treasury of the government whose law levied it, a government that raises its rate ends with more unless its sales fell for a recorded reason, and money that leaves to the outside has a named cause. Seen: the county's treasury, which ends lower after it raises a sales tax, and the Metrics tab's money result.

**Cause.** Needs cause. Looked at: Marion, Mississippi, seed 7df73e53cd67: a town sales tax raise of 10.59 points left businesses $277,900 lower, recorded $283,600 leaving to the outside, and a county raise left governments $7,700 lower. Candidate code: `syncSalesTax` in src/core2/modules/budgets.ts (line 1039) and `sweepReserves` in src/core2/budgets-treasury.ts (line 1631).

**Fix.** None until the cause is found.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: one tax dollar is followed from a named buyer's purchase to the seller that collected it, to the treasury that levied it, by record id. Ask why: the proof says, by record, why $283,600 left town, and names the cause of every dollar a government lost after raising a tax. One model, two tiers: counted households pay the tax on what they buy by the same rule as full people, times their count. Sliding scales and causes: shoppers buy less or elsewhere by how far the price moved, for a recorded reason, never all at once.

**Done when.** A second session, not the builder, runs the twin check through dev mode's own law control in the running game. Start the bench (`OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed the title shows; redraw until the place has both a town board and a county board that may set a sales tax. In dev mode's Bills panel on the Government screen pick the town board as the Body, a Sponsor, the Law (sales tax) and a Value above the rate in force, press Introduce, set the Margin to 3 and the Executive to Signs, and press Pass. The bill page must show one section and no rider (screenshot). Run 120 days in the Run panel. Start a second game on the same place and seed, pass nothing and run the same 120 days. Compare every cash account in the two worlds: full people in town, counted households, businesses, each government's treasury and the outside account. The treasury of the government that raised the tax must end higher than in the twin, by the extra tax its sellers collected less any sales lost for a named reason; every dollar that left to the outside is named by the payment's own label; and one purchase is followed by record id from buyer to seller to treasury. Repeat with the county board as the Body: the county's treasury must end higher, not lower. Then the same check as a named repro in Marion, Mississippi, seed 7df73e53cd67 (10.59 points, town board and county board), and in LaGrange, Wyoming, seed 63355aee286d. The script pair `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" node --max-old-space-size=4500 --import tsx scripts/dev-tests/law-run.ts <seed> county law:sales-tax 120` (one heavy run at a time) must point the same way, and a test on a drawn place fails when the levying government ends lower. The owner plays it: he raises the town's sales tax, prices at the register go up, and the town's treasury takes in more.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts (`syncSalesTax`, line 1039, which sets each government's purchase tax and its payee account; `accountFor`, line 1687), src/core2/modules/place-prices.ts, src/core2/budgets-treasury.ts (`sweepReserves`, line 1631), scripts/dev-tests/law-run.ts

**Notes.** From the Fable audit, Pillar 2, "A sales tax raise falls on businesses, and the money leaves town" and the wrong-way list ("The county sales tax result, above, also looks wrong: governments ended $7,700 lower after raising a tax"). Measured: every figure above, in two towns. The audit does not restate the size of the raise or the day count for LaGrange. Not traced: where the money goes once it leaves town ("I did not trace... where a sales tax raise's money goes once it leaves town"). The audit's call: "the property tax and sales tax results are general, since they held everywhere I tried them." Read on main, Nov 10, not shown to be the cause: `syncSalesTax` pays a city or township rate to the city government, else the county, else the state, and a county rate to the county, else the state, so in a place whose town or county keeps no treasury of its own the tax goes up a level; and the reserve sweep sends a treasury's surplus to the outside account each month (see `money-town-tax-raise-leaves-its-own-treasury-no-richer`). Related: `prices-sales-tax-shifts-to-shelf-price` (open; a sales tax change should move the shelf price buyers pay, not only what sellers remit, which would explain the cost falling on businesses), `release-red-law-reach-group-b-handler-count-sales-tax` (open), `world-sales-tax-shortfall` (done). The checker must confirm its bills left with one section (`gov-riders-added-when-every-vote-is-forced`).

**Notes (Fable's check, Nov 10).** How to find the cause: run the Marion, Mississippi twin and compare the journals of the town, the county and the outside account by payment kind, month by month. The candidates are the payee account chosen in `syncSalesTax` (src/core2/modules/budgets.ts line 1039) and the reserve sweep (`sweepReserves`, src/core2/budgets-treasury.ts line 1631). The fix is then made at the payee account choice or the sweep, so the government that levied the tax keeps it. Read money-town-tax-raise-leaves-its-own-treasury-no-richer, which concerns the same sweep.
