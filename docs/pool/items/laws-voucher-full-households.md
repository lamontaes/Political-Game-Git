---
id: laws-voucher-full-households
title: "School vouchers also pay on full households' tuition plans, not only the counted flow"
area: laws
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: laws-family-school-vouchers
source: added with npm run pool -- add
---

**What.** The voucher payment is sized to the counted households' tuition flow only (PR #4449). As counted households are filled in (staff hires, people met), their tuition moves from that flow into each full household's own living plan at the school, so the voucher shrinks while the same tuition is still paid. Size and pay it on both tiers' tuition at the school.

**Rules.** One model, two tiers (counted and full households read by the same rule); an effect is a read.

**Done when.** In a drawn place with a private school, a voucher law in force and a year of play: the voucher's total follows counted plus full-household tuition (the sum is flat across fill-ins), shown by record id; the repeal ends it.

**Files.** src/core2 voucher payment from #4449; src/core2/cost-of-living.ts (living plans, read only).

**Notes.** Found by world-counted-tuition-drops (#4463), which showed the counted flow falling $5,102.65 to $3,870.99 while the total stayed $7,653.98 (Hallam, Nebraska, seed 784af49202cb1f54).
