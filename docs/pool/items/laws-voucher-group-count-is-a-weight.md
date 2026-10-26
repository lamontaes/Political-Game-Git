---
id: laws-voucher-group-count-is-a-weight
title: "The school voucher's counted-group records hold a weight where the people count belongs"
area: laws
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The school voucher law's applied records for counted groups put a weight in the `count` field, which every reader takes as the number of people the group stands for (`src/core2/law-reach/group-b-money.ts:1011`, found by the health-schools helper, Oct 25). In the health-schools year run in Uehling, Nebraska (seed 5e27b0c4196fd3a8) the voucher's group records say 310,500 people, where the same town's SNAP group record says 16. The matrix's reach cells and anything that sums people under a law then overstate the voucher's reach by orders of magnitude.

**Rules.** One model, two tiers: a counted group is read by every engine with the same rule as a full person, times its count, so the count must be people.

**Done when.** The voucher's group records carry the number of people the group stands for, a test asserts that count against the counted group's own size in a drawn place, and the health-schools family's year run in Uehling, Nebraska (seed 5e27b0c4196fd3a8) shows a voucher reach of the same order as the town's counted population, by record id.

**Files.** src/core2/law-reach/group-b-money.ts

**Notes.** From the laws lead, Oct 25, on the health-schools helper's report.
