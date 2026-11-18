---
id: housing-line-help-from-rent-and-income
title: "A housing line helps each renter at its rent above its share of income, out of the line's dollars, not at HUD's average voucher"
area: world
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pins-housing-programs
pr: 9956
blocked-on:
after:
lead: world
source: Justice lane, Nov 17, 2026, family 25 of the CTO's LIFT THE PINS list (issue 9747, comments 6936897718 and 6936902790), part C item 11; the CTO took it ahead of B items 7 to 10 at 11:14Z
model: sonnet
effort: medium
root: none
---

**What.** A city, county or state housing line above its Census base paid each helped renter HUD's average voucher (about $960 a month, a published figure), so a household whose income carried most of its rent was paid as much as one with none. The owner ruled on Nov 16 that everything comes from the simulation and nothing is pegged to real numbers.
Seen: the rent help a household receives, in dev mode's housing records and the law page of a housing line.

**Cause.** Found in code: `payRentAssistance` in src/core2/housing-assistance.ts read `housingAssistanceAnnualMinor` (HUD Picture of Subsidized Households 2023), turned the line into a count of vouchers at that figure, and paid each household the lesser of one voucher and its rent.

**Fix.** Each helped household is paid its own rent above its share of its income (`housingVoucherTenantIncomeShare`, 42 U.S.C. 1437f(o), the rule `payHousingVouchers` already applies to the federal entitlement), out of the line's dollars for the month, the households with the least income per member first, until the dollars run out; a household whose income carries its rent needs none. `housingAssistanceAnnualMinor` is deleted. The three tests that sized a raise in "a thousand vouchers' worth" size it in the line's own dollars.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** No dice: help is computed from rent and income records. One rule, all 56 places: the same federal rule everywhere.

**Done when.** A second session opens a drawn place, Lafayette, Colorado (seed 3da19558bdb4a07c) or any other, raises its housing line in dev mode and sees more households helped, each at its rent above 30 percent of its income, then cuts it and sees fewer, and src/core2/law-wiring-housing.test.ts, src/core2/housing-assistance-share.test.ts and src/core2/budget-line-extra.test.ts pass on main.

**Waits on.** Nothing; the rule is already in `payHousingVouchers`.

**Files.** src/core2/housing-assistance.ts, src/core2/data/laws/reach-group-a-parameters.json, src/core2/law-wiring-housing.test.ts, src/core2/housing-assistance-share.test.ts, src/core2/budget-line-extra.test.ts
