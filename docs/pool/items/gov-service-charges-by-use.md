---
id: gov-service-charges-by-use
title: "Government charges and fees are paid by the people who use each service, not spread over living costs"
area: gov
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Today src/core2/budgets-service-charges.ts makes the town's households pay every government charge (tuition, hospital bills, sewer and trash, parks, tolls) in proportion to the living cost each pays on the 1st, so a household that uses no service still pays and no business pays a charge. Replace that spread, service by service, with charges paid by the user on the day of use: tuition by the households of enrolled students (the school engine's enrollment records), sewer and trash by dwellings and businesses (housing and business records), hospital charges by patients (the health engine's visits, where recorded). A service whose use is not recorded yet keeps the living-cost share for that line only, named in the row. This closes SG-GOV-service-charges-by-living-cost.

**Rules.** An effect is a read, not a record: each charge is posted when the school, housing or health engine records a use, and the budget reads the receipts. One model, two tiers: counted households pay the same charge rule times their count. Replace, never layer: the living-cost spread is deleted for every line that gains a user, not kept beside it.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body), a household with an enrolled student pays tuition and a childless household does not, named by record id, sewer and trash charges reach at least one business by record id, the budget's charges line still balances in src/core2/budgets-service-charges.test.ts, and the stopgap row is resolved or narrowed to the lines with no recorded use.

**Files.** src/core2/budgets-service-charges.ts, src/core2/budgets-service-charges.test.ts, src/core2/modules/school.ts, src/core2/modules/housing.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-GOV-service-charges-by-living-cost, which had no live pool item. See also open PR #5425 (notes on the ten service-charge gaps against Table 1).

Deferred Oct 25: nothing on screen reads it yet.

**Notes (Money, Nov 8, night; claimed on main).** Read before building. Today `syncServiceCharges` (`budgets-service-charges.ts:127`) works out each state or local government's yearly `chargesAndFees` revenue line times the town's modeled share of its residents, over twelve, and divides that by the town's total monthly living cost to get one `share` per government. The residents engine then takes that share off every household's living cost on the 1st (`living-cost-split.ts` `shares`, `paid`), named and counted alike, and `paid` records it by service (`byService`, the Census 2022 mix in `service-charges-2022.json`) and notes it as town revenue (`noteTownRevenue`). So the services are known (education, hospitals, highways and tolls, airports and parking, parks, sewerage and solid waste, housing and community development, other) but not the users. The way to replace it service by service, as the item says: take a service's slice out of the spread for the households that use it, so each service needs a record of use to charge against: tuition by enrolled students (the school engine's enrollment, counted households by their group's enrolled share), sewer and trash by dwellings and businesses (housing and business records), hospital charges by patients (health visits). First slice proposed: sewerage and solid waste by occupied dwelling and by business, because housing already keeps every dwelling (leases and owned homes, named and counted) and every firm: the service's monthly target splits over dwellings and firms by a documented weight (a firm pays the Census ratio of commercial to residential sewer charges), the slice leaves the living-cost share, and `byService` records the posted dollars by payer. Not started tonight: it changes what every household pays each month, so it needs the same-seed check on household cash (the charges move between payers and the totals must not) and a `speed:year` comparison.
