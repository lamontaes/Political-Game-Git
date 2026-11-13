---
id: gov-town-plan-vs-payers
title: "A town collects several times its planned revenue: its Census-scaled plan and what its laws and payers raise disagree"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
lead: legislation
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: low
root: none
source: Money, Nov 9; scripts/money/collected.ts
claimed-at:
checked: fable 2026-11-10
---

**What.** A town collects several times its planned revenue. In Wooster, Indiana (key 1885562, seed money-1) the town's treasury took in 0.53 B (units of 100 million minor, credits on the cash journal) in 2026 against a planned revenue of 0.14 B, a ratio of 3.7, while the state (1.014) and the county (1.016) sit near 1. The town's plan is the Census fiscal-2022 per-resident line times its residents, and its income is what the town's laws (property, sales, income taxes and charges) raise from its modeled payers. The two should come from the same laws and payers; until they do, the town's spending cannot be voted from its receipts (SG-GOV-spending-vote-state-county). Seen: the town budget screen's revenue against its plan.

**Cause.** Found in code: `billPropertyTax` in `src/core2/housing-property-tax.ts` (line 122) bills every owned home that `ownedHomes` in `src/core2/modules/housing.ts` (line 2849) returns, wherever it is. It gets each home's terms from `terms()` (line 110), which calls the registered source directly. `propertyTaxRateInForce` (line 97) returns nothing for a place other than the housing town ("The rate in force is the town's law; other places are not billed by it"), but `terms()` skips that check. The registered source, `propertyTaxTerms` in `src/core2/modules/budgets.ts` (line 1123), ignores the place. So a home of a household placed in another state is billed at the town's county rate and paid to the town's county collector. `remitPropertyTax` (budgets.ts line 1207) then passes that money to the state, county and town by their planned property tax per resident. Measured: Wooster, Indiana (1885562), seed money-1 (`scripts/money/collected.ts`'s draw), main 903b659706. 603 owned homes are billed, and only 54 are in the town: 161 sit at `US-IN`, 32 at `US-CA`, 28 at `US-TX`, across 58 places. In 2026 the collector took $1,320,250, of which $1,254,601 came from counted households' `property-tax:household:...` entries and about $65,600 from the town's 48 full owner households. The three governments' planned property tax for the town's 69 residents is $1,455.72 per resident, about $100,400. The town's `property-tax-remit` was $427,100 against a whole-town plan of $141,800, which gives `collected.ts`'s ratio of 3.7. The plan is the right side; the receipts bill homes the town's law does not reach.

**Fix.** In `terms()` in `src/core2/housing-property-tax.ts` (line 110), return `undefined` when `placeId` is not `api.state.placeMetadata?.housingTown`, the same check `propertyTaxRateInForce` makes. `billPropertyTax` already skips a home with no terms ("No law in force for this place: nothing is billed"). Nothing else changes: homes elsewhere are not billed by the town's law. Add a case to `src/core2/housing-property-tax.test.ts`: in a drawn place, after one month, every `property-tax-billed` law-applied row names a household whose home is in the housing town.

**Time box.** 1 hour for one Sonnet session.

**Rules.** Wire to the world: the town's plan and its receipts come from the same laws and payers, so a vote reads one record of what the town raised, proven in a generated world. One rule, all 56 places: the reconciliation runs in drawn places and names no place in code. Estimate, never UNKNOWN: a plan figure the town's payers cannot support is a registered estimate with its source and spread. Real town ratios are reported, never steered to (owner, Nov 8: ranges aren't targets).

**Done when.** A second session runs `npx tsx scripts/money/collected.ts money-1 2` and two more drawn seeds (named), and sees the town's yearly collected total within the spread of its plan, with `property-tax-remit` no larger than the three levels' planned property tax for the town's residents. It also reads the collector's 2026 receipts by household record id and finds only homes in the town. The real-town ratio is reported as a figure, not a pass mark.

**Waits on.** Nothing.

**Files.** src/core2/housing-property-tax.ts, src/core2/modules/housing.ts, src/core2/modules/budgets.ts, src/core2/housing-property-tax.test.ts, scripts/money/collected.ts

**Notes.** Money, Nov 9: measured while building the receipts tally for the spending vote (gov-budget-spending-voted-from-revenue).

**Notes (Fable, Nov 10, model).** The sort marked this for a Fable-level model. Read again by Fable: Finding this cause is one engine's receipts read against one plan: an Opus session at high effort can do it, and a second session checks the cause before anything is built on it.

Nov 11 (cause finder for Fable B): measured Wooster, Indiana (seed money-1) on main 903b659706 with probes on the cash journal, since removed. The town's excess is all `property-tax-remit`: the county collector bills 603 owned homes, 549 of them outside the town, at the town's county rate, and shares the take by planned per-resident levies. The fix is the town-only check that `propertyTaxRateInForce` already makes, in the terms the billing reads.
