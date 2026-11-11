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
after: laws-pension-funding-no-sends-money-out-of-governments
blocked-on:
lead: laws-effects
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "Every law in dev mode's list, tried at four bodies")
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** A sales tax raise falls on businesses, most of the money leaves town, and the government that raised it gains little or loses. Measured in the law sweep in Marion, Mississippi (seed 7df73e53cd67), against a twin world with no bill. The town board added 10.59 points: businesses ended $277,900 lower and households $24,100 lower, governments gained $19,600, and $283,600 was recorded as leaving to the outside. When the county board passed the same raise, governments ended $7,700 lower. The sweep ran 120 days for local bodies. In LaGrange, Wyoming (seed 63355aee286d) the result held: businesses ended $80,000 lower, households $400 lower, and $72,000 left town. The audit did not trace whether shoppers went elsewhere or the tax was paid outward, and it lists the county result among those that point the wrong way. Trace the tax by the payments' own labels from the till to the treasury, and fix it at the cause for every government that levies a sales tax: the tax collected on sales in the place is paid to the treasury of the government whose law levied it, a government that raises its rate ends with more unless its sales fell for a recorded reason, and money that leaves to the outside has a named cause. Seen: the county's treasury, which ends lower after it raises a sales tax, and the Metrics tab's money result.

**Cause.** Measured: a labeled twin probe on main d604b3494b in Marion, Mississippi (2845160, world seed 7df73e53cd67) enacted a town sales tax of 10.59 points the day after the opening, with no bill, ran 120 days against the same world with no law, and summed the cash journal by owner kind and reason. Two causes explain the whole result. First, sellers pay the tax out of the same prices. Employers in town paid $450,546 more `sales-tax` to the treasury (base $350,744), while town households' spending barely moved (counted households -$41,799 net, named people +$12,480). `syncSalesTax` in `src/core2/modules/budgets.ts` (line 1039) registers each level's tax with `api.setPurchaseTax` as "the share of a tax-inclusive price" (line 1088), so a higher rate raises no price; it only takes a bigger share of receipts the seller already had. Second, the money that "leaves to the outside" is the treasury's reserve sweep: the town treasury swept $409,613 more to the outside account (`sweepReserves`, `src/core2/budgets-treasury.ts` line 1631), leaving it +$17,668. That is the cause and fix written in `laws-pension-funding-no-sends-money-out-of-governments`. The rest of the employers' difference is one firm entering in one world only ($408,235 startup loan, $120,926 entry), which is twin divergence.

**Fix.** Make a sales tax raise the price the buyer pays, not the seller's share. Where `api.setPurchaseTax` charges a sale, take the level's tax on top of the seller's pre-tax price: the buyer pays price times (1 + total rate / 100), and the seller keeps its pre-tax price. A rate change then moves buyers' spending, and households and counted groups pay it by the same rule, times their count. Keep the opening's prices as they are, by reading the opening's own rate as already inside them, so a world with no change moves nothing. Read the setter's implementation in `src/core2/state.ts` and the purchase writers that call it before choosing where the rate is applied, and keep one place that does it. The reserve sweep part needs nothing here: it is fixed by `laws-pension-funding-no-sends-money-out-of-governments`.

**Time box.** 5 hours for one Opus session, after the pension item's fix lands.

**Rules.** The chain is the acceptance: one tax dollar is followed from a named buyer's purchase to the seller that collected it, to the treasury that levied it, by record id. Ask why: the proof says, by record, why $283,600 left town, and names the cause of every dollar a government lost after raising a tax. One model, two tiers: counted households pay the tax on what they buy by the same rule as full people, times their count. Sliding scales and causes: shoppers buy less or elsewhere by how far the price moved, for a recorded reason, never all at once.

**Done when.** A second session runs a labeled twin of a town sales tax raise in Marion, Mississippi (seed 7df73e53cd67) and in a drawn place (named with its seed) for 120 days, and sees buyers (named people and counted households) pay most of the tax through higher prices, sellers' pre-tax receipts about unchanged, and the town treasury's cash plus reserve investments higher by about the tax, by journal record id. A county raise points the same way.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts (`syncSalesTax`, line 1039, which sets each government's purchase tax and its payee account; `accountFor`, line 1687), src/core2/modules/place-prices.ts, src/core2/budgets-treasury.ts (`sweepReserves`, line 1631), scripts/dev-tests/law-run.ts

**Notes.** From the Fable audit, Pillar 2, "A sales tax raise falls on businesses, and the money leaves town" and the wrong-way list ("The county sales tax result, above, also looks wrong: governments ended $7,700 lower after raising a tax"). Measured: every figure above, in two towns. The audit does not restate the size of the raise or the day count for LaGrange. Not traced: where the money goes once it leaves town ("I did not trace... where a sales tax raise's money goes once it leaves town"). The audit's call: "the property tax and sales tax results are general, since they held everywhere I tried them." Read on main, Nov 10, not shown to be the cause: `syncSalesTax` pays a city or township rate to the city government, else the county, else the state, and a county rate to the county, else the state, so in a place whose town or county keeps no treasury of its own the tax goes up a level; and the reserve sweep sends a treasury's surplus to the outside account each month (see `money-town-tax-raise-leaves-its-own-treasury-no-richer`). Related: `prices-sales-tax-shifts-to-shelf-price` (open; a sales tax change should move the shelf price buyers pay, not only what sellers remit, which would explain the cost falling on businesses), `release-red-law-reach-group-b-handler-count-sales-tax` (open), `world-sales-tax-shortfall` (done). The checker must confirm its bills left with one section (`gov-riders-added-when-every-vote-is-forced`).

**Notes (Fable's check, Nov 10).** How to find the cause: run the Marion, Mississippi twin and compare the journals of the town, the county and the outside account by payment kind, month by month. The candidates are the payee account chosen in `syncSalesTax` (src/core2/modules/budgets.ts line 1039) and the reserve sweep (`sweepReserves`, src/core2/budgets-treasury.ts line 1631). The fix is then made at the payee account choice or the sweep, so the government that levied the tax keeps it. Read money-town-tax-raise-leaves-its-own-treasury-no-richer, which concerns the same sweep.

Nov 11 (cause finder for Fable B): ran a labeled twin in Marion on main d604b3494b (town sales tax of 10.59 points, 120 days, enacted directly). Sellers paid all of the $450,546 of new tax out of unchanged prices, because the purchase tax is taken as a share of a tax-inclusive price. The treasury then swept $409,613 of it to the outside, the pension item's cause. One firm's entry in one world is noise.
