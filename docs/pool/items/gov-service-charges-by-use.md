---
id: gov-service-charges-by-use
title: "Government charges and fees are paid by the people who use each service, not spread over living costs"
area: gov
kind: stopgap
priority: 2
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
