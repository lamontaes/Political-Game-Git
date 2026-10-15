---
id: world-counted-tuition-drops
title: "Counted private tuition falls 24 percent in the first 45 days of a played world, with no law change (Hallam, Nebraska)"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: found by a Claude session building laws-family-school-vouchers (control run without the law)
---

**What.** The counted households' private tuition (`household.customer.private-school`, one monthly purchase flow per school, `amountByContract` per household) is $5,102.65 a month at the start in Hallam, Nebraska (place 3120610, seed 784af49202cb1f54, start date 2025-01-20) and $3,870.99 on 2025-03-07, a fall of 24 percent in 45 days, with no law change (a control run without the voucher law shows the same drop). Find what rewrites the flow (a household leaving, a child aging out, a funding cut) and whether the fall is a cause or an error.

**Rules.** An effect is a read; no dice; one rule, all 56 places; estimate, never unknown.

**Done when.** The cause of the change is named by record id in a played world; either the flow follows from households' own records, or the defect is fixed and a year in a drawn place keeps tuition near the NCES average spread over families.

**Files.** src/core2/modules/residents.ts, src/core2/residents-economy.ts, src/core2/counted-money.ts

**Notes.** Found while building laws-family-school-vouchers, which reads the flow each month and so follows the fall.
