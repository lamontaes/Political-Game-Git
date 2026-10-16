---
id: world-counted-tuition-drops
title: "Counted private tuition falls 24 percent in the first 45 days of a played world, with no law change (Hallam, Nebraska)"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4463
blocked-on:
source: found by a Claude session building laws-family-school-vouchers (control run without the law)
---

**What.** Not a defect. The counted tuition flow in Hallam, Nebraska (seed 784af49202cb1f54, from Jan 20, 2025) falls from $5,102.65 to $3,870.99 on Feb 19 because the staff review hires seven people from counted households (`hireStaff` to `fillInPerson` to `releaseResidentHousehold`, residents.ts:1480). Each filled-in household takes its tuition part out of the counted flow and into its own living plan at the same school (`admitEverydayPurchase`, cost-of-living.ts). Counted plus full-household plans at the school: $7,653.98 on day 0 and on day 45 (13 plans, $2,551.33 then; 20 plans, $3,782.99 and $3,870.99 counted after). Nothing falls with no law.

**Rules.** An effect is a read; one model, two tiers (a measure of the counted tier alone loses households as they are filled in).

**Done when.** `src/core2/residents-fill-in-purchases.test.ts` (a drawn place, filled-in households, every seller's total across both tiers unchanged) passes.

**Files.** src/core2/residents-fill-in-purchases.test.ts (new, test only).

**Notes.** Found by the school-vouchers builder (#4449) measuring the counted flow alone: its voucher is re-sized monthly to the counted tuition, so it falls as households are filled in while the same tuition is paid by full households. Whether a voucher should also follow full households' plans is that item's call (laws-family-school-vouchers); nothing here blocks it.
