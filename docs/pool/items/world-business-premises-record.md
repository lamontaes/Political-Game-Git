---
id: world-business-premises-record
title: "Each business has a premises record (floor space, assessed value, owned or leased) and equipment, so property tax and closure have something to read"
area: world
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
milestone:
lead: jobs
model: opus
effort: medium
root: none
source: Split from world-stopgap-employer-taxes-missing-engine and world-stopgap-finance-state-business-closure by pool feeder Oct 20
checked: fable 2026-11-10
---

**What.** A business's books record cash, sales, costs and wages but no building and no equipment, so the property-tax engine, which bills homes only, has nothing to bill a business for, and a closing business has nothing to sell. Add a premises record to each business in the business module: floor space from the EIA CBECS median floor space per worker for its kind of building activity, an assessed value from the place's commercial value per square foot (estimated from the state's taxable commercial property per the Census of Governments, with its spread), whether the business owns the premises or leases them from a landlord, and an equipment value from the IRS depreciable-assets share of receipts for its industry. Premises owned by the business are taxed at the property-tax rate in force; leased premises are taxed to the landlord and reach the business through rent. The cost shares in business-books already include rent and taxes, so the tax paid or the rent must come out of the same operating cost, not on top of it.

**Cause.** Found in code: src/core2/housing-property-tax.ts (`billPropertyTax`, line 122) bills homes only, and src/core2/modules/business.ts keeps no building or equipment (the word premises does not appear in it).

**Fix.** Add a premises record per business (floor space, assessed value, tenure, equipment) from sourced tables in src/core2/data/business/premises.json (new), taxed to the owner through the existing property-tax engine or reaching the business through rent, inside the existing occupancy share of the business cost ratios.

**Time box.** 10 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the premises must move money, the tax or the rent, by journal record, and be read by the property-tax and closure engines. One rule, all 56 places: values and rates come from place data, with no state named. Estimate, never UNKNOWN: a place with no commercial value row takes its state's average, marked ESTIMATED with source and spread. One model, two tiers: a counted-owner business has the same premises row as a full-owner one. Look before you register: the books' cost ratios already include occupancy cost, so avoid double counting. Numbers in the parameter table are SOURCED, ESTIMATED or TUNABLE.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`) in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose) and sees every open business carry a premises record id with floor space, assessed value, tenure and equipment value, a business that owns its building billed the property tax in force by journal record id, and a leased one paying rent from which the landlord's tax bill is drawn; the business's total occupancy cost stays inside its industry's existing cost share (no double count); src/core2/business-premises.test.ts proves it.

**Waits on.** Nothing.

**Files.** src/core2/modules/business.ts, src/core2/data/business/premises.json (new), src/core2/housing-property-tax.ts, src/core2/data/parameters.json, src/core2/business-premises.test.ts (new)

**Notes.** Split from world-stopgap-employer-taxes-missing-engine and world-stopgap-finance-state-business-closure by pool feeder Oct 20.

**Notes (Fable B, Nov 10, depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have recorded each business's building so the town could tax it and a closing business could sell its equipment; that is tracking buildings, which the owner ruled out with land parcels.
