---
id: people-stopgap-residents-housing-and-leakage
title: "Stopgaps in residents (housing-and-leakage): 1 open"
area: people
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/residents.ts, kind housing-and-leakage"
after:
claimed-at:
---

**What.** Pay the part of a household's living cost that is not local to outside sellers by category, instead of to one outside account. Rent and mortgages are already paid to recorded landlords and the bank (world-rent-flows, done), so what is left in `src/core2/residents.ts` (the `outside-living-costs` flows and `countedOutside`) is the non-local basket: utilities, outside stores, vehicles, health, travel. Split each household's unbound monthly cost across the BLS Consumer Expenditure categories the basket already uses, and for each category pay the local share to the recorded local sellers of that category and the rest to the place's outside-market account (`opening-outside-market.ts`) under a category reason key. The local share per category is the place's location-quotient leakage: the category's local employment share against the national share (from the County Business Patterns counts the opening already reads), so a town with no car dealers buys all its cars outside. Then pass `outsideLivingCosts: false` to `collapseToTwoLevels`, deleting the old single payment and its stopgap marker.

**Rules.** Replace, never layer: the single outside living-cost payment, the `outsideLivingCosts` option and SG-CORE-outside-living-costs are deleted in the same change. One model, two tiers: a counted household pays its categories by the same rule as a full household, times its weight, to the same outside-market account. Wire to the world: every payment is a journal record between the household and a recorded local seller or the outside account, matched by a row in outside-flows.json, and every dollar balances. An effect is a read, not a record: the regional engine reads the per-category outside payments as the town's imports and the local sellers read what they receive. One rule, all 56 places: leakage comes from place data. Estimate, never UNKNOWN: a category with no local count uses the county's, marked ESTIMATED.

**Done when.** In a one-year run of the played world (buildBenchWorld, a place drawn from all 56 with a seed the builder did not choose, both named in the PR body) a named household's monthly payments appear by category on the journal to named local sellers and the outside account, a category the town has no sellers in is paid entirely outside, no outside-living-costs flow remains, the regional engine's import record reads the outside totals by category, and the ledger balances. Proved by src/core2/residents.test.ts and src/core2/housing.test.ts.

**Files.** src/core2/residents.ts, src/core2/modules/residents.ts, src/core2/opening-outside-market.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps.json

**Notes.** First row: Each household's assigned living cost (CEX basket plus HUD Fair Market Rent) not bought from a recorded local seller is paid to one outside account on the 1st: no landlord, mortgage, utility or outside store.

Oct 20 (pool feeder): spec written; the rent and mortgage half of the replacement is already done (world-rent-flows, #4872); only the non-local basket by category remains. The stopgap row text still says "no landlord" and should be updated when it is resolved.
