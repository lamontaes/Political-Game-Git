---
id: housing-rent-help-income-omits-benefits
title: "Rent help ranks renters by wages and pensions only, so a household living on benefits counts as having no income"
area: world
lead: laws-effects
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-housing-rent-help-income-omits-benefits
pr: #8600
after:
blocked-on:
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
source: laws-and-effects lead, Oct 27 (housing helper's diagnosis on #6011)
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:08:48.317Z
---

**What.** Rent help from a housing line above its base pays the renters with the least income per member first, and the income it ranks by leaves out cash assistance, SSI and disability payments, so a household living on them ranks as if it had no income. The income is wages plus retirement contracts for a full household and `householdIncome` for a counted one. In Washington, D.C. and Rockville, Maryland on October 26 many renters showed no recorded income, and a hundred vouchers went to two counted groups. HUD counts those benefits as annual income when it ranks and prices a voucher. Seen: who gets a rent voucher, on a household's card and in the housing line's reach, where a household living on benefits counts as having no income.

**Cause.** Found in code: src/core2/housing-assistance.ts ranks tenants by `a.incomeMinor / a.memberIds.length` (lines 65 and 66), and the income comes from src/core2/housing-occupancy.ts (the tenant's `incomeMinor`, set at lines 111 and 136: wages and retirement contracts for a full household, `householdIncome` for a counted one), which omits benefits.

**Fix.** Add cash assistance, SSI and disability payments to the income both ranks use, for full and counted households alike, following HUD's annual income definition (24 CFR 5.609).

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Simulate it, don't ask (owner, Oct 24): the voucher's income test follows HUD's annual income definition, calibrated, not hardcoded. One model, two tiers (owner, Oct 14): full and counted households are ranked by the same income rule. Research before building: cite the definition.

**Done when.** A second session, not the builder, runs a played year (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose, both named. A renter household whose only income is a benefit ranks for rent help by that benefit's amount, a test names its rent-assistance journal entry and rank by record id, and the same rule ranks a counted group by its households' benefits.

**Waits on.** Nothing.

**Files.** src/core2/housing-assistance.ts, src/core2/housing-occupancy.ts, src/core2/law-wiring-housing.test.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27, from the housing helper's diagnosis on PR #6011 (commit 8e75869ee8).
