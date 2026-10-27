---
id: housing-rent-help-income-omits-benefits
title: "Rent help ranks renters by wages and pensions only, so a household living on benefits counts as having no income"
area: world
lead: laws-effects
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: laws-and-effects lead, Oct 27 (housing helper's diagnosis on #6011)
---

**What.** Rent help from a housing line above its base pays the renters with the least income per member first (src/core2/housing-assistance.ts:52). The income it ranks by is wages plus retirement contracts for a full household and householdIncome for a counted one (src/core2/housing-occupancy.ts:89 and :131). Cash assistance, SSI and disability payments are left out, so a household living on them ranks as if it had no income. In Washington, D.C. and Rockville, Maryland on October 26 many renters showed no recorded income, and a hundred vouchers went to two counted groups. HUD counts those benefits as annual income when it ranks and prices a voucher.

**Rules.** Simulate it, don't ask (owner, Oct 24): the voucher's income test follows HUD's annual income definition (24 CFR 5.609), calibrated, not hardcoded. One model, two tiers (owner, Oct 14): full and counted households are ranked by the same income rule. Research before building: cite the definition.

**Done when.** In a played year (buildBenchWorld, a place drawn from all 56 with a seed the builder did not choose, named in the PR body), a renter household whose only income is a benefit ranks for rent help by that benefit's amount, a test names its rent-assistance journal entry and rank by record id, and the same rule ranks a counted group by its households' benefits.

**Time box.** 2 hours, one Sonnet builder; waits on nothing.

**Files.** src/core2/housing-assistance.ts, src/core2/housing-occupancy.ts, src/core2/law-wiring-housing.test.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27, from the housing helper's diagnosis on PR #6011 (commit 8e75869ee8).
