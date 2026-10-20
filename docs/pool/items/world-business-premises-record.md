---
id: world-business-premises-record
title: "Each business has a premises record (floor space, assessed value, owned or leased) and equipment, so property tax and closure have something to read"
area: world
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: 
blocked-on:
milestone:
source: Split from world-stopgap-employer-taxes-missing-engine and world-stopgap-finance-state-business-closure by pool feeder Oct 20
---

**What.** A business's books record cash, sales, costs and wages but no building and no equipment, so the property-tax engine, which bills homes only, has nothing to bill a business for, and a closing business has nothing to sell. Add a premises record to each business in the business module: floor space from the EIA CBECS median floor space per worker for its kind of building activity, an assessed value from the place's commercial value per square foot (estimated from the state's taxable commercial property per the Census of Governments, with its spread), whether the business owns the premises or leases them from a landlord, and an equipment value from the IRS depreciable-assets share of receipts for its industry. Premises owned by the business are taxed at the property-tax rate in force; leased premises are taxed to the landlord and reach the business through rent. The cost shares in business-books already include rent and taxes, so the tax paid or the rent must come out of the same operating cost, not on top of it.

**Rules.** Wire to the world: the premises must move money, the tax or the rent, by journal record, and be read by the property-tax and closure engines. One rule, all 56 places: values and rates come from place data, with no state named. Estimate, never UNKNOWN: a place with no commercial value row takes its state's average, marked ESTIMATED with source and spread. One model, two tiers: a counted-owner business has the same premises row as a full-owner one. Look before you register: the books' cost ratios already include occupancy cost, so avoid double counting. Numbers in the parameter table are SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), every open business has a premises record id with floor space, assessed value, tenure and equipment value, a business that owns its building is billed the property tax in force by journal record id, a leased one pays rent that the landlord's tax bill is drawn from, the business's total occupancy cost stays within the industry's cost share, and src/core2/business-premises.test.ts proves it.

**Files.** src/core2/modules/business.ts, src/core2/data/business/premises.json, src/core2/housing-property-tax.ts, src/core2/data/parameters.json, src/core2/business-premises.test.ts

**Notes.** Split from world-stopgap-employer-taxes-missing-engine and world-stopgap-finance-state-business-closure by pool feeder Oct 20.
