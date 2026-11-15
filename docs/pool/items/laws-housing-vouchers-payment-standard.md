---
id: laws-housing-vouchers-payment-standard
title: "A housing voucher pays a family's whole rent above its share, with no payment standard"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: laws-housing-vouchers-pay-eligible-renters
blocked-on:
lead: laws-effects
source: Account lead's acceptance of PR #9486, Nov 15, 2026 (laws thread)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** Under vouchers for every eligible family, the Treasury pays a family in town all of its rent above 30 percent of its income, however dear the unit. The real program pays only up to a local payment standard, and a family in a dearer unit pays the difference itself. Seen: the household money of a paid renter in dev mode, and the law page's dollars.

**Cause.** Found in code: `payHousingVouchers` (src/core2/housing-assistance.ts) pays `min(rent, rent − 0.3 × income)`. The lease's rent stands in for the payment standard (its source says so), and nothing caps it. Measured: Eveleth, Minnesota (2719934), world seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, on PR #9486's head. The law was enacted and 40 days run. The town has 600 renting households, with a weighted median rent of $1,093.63 a month. Of the 298 paid households the probe matched to a lease (of 303 rows), 3 rent above that median, by $302 a month in all.

**Fix.** Read a payment standard for the town from the rents the housing engine already keeps, never a typed figure. HUD sets it between 90 and 110 percent of the area's fair market rent (24 CFR 982.503), which is near the 40th percentile of rents. Then pay `min(standard, rent) − 0.3 × income`. The standard is an ESTIMATED row with that spread, and the player sees it in the dollars on the law page.

**Time box.** 2 hours for one Opus session at medium effort.

**Rules.** One model, two tiers: counted households pay by the same rule. Estimate, never UNKNOWN. No dice.

**Done when.** A second session, not the builder, starts the bench in a drawn place and writes down the place and seed. In dev mode it passes the vouchers law and runs past the next housing review. On the law page, a family whose rent is above the standard is paid less than its rent minus its share, by record id.

**Waits on.** laws-housing-vouchers-pay-eligible-renters.

**Files.** src/core2/housing-assistance.ts, src/core2/data/laws/reach-group-a-parameters.json
