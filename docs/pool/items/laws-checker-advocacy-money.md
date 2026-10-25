---
id: laws-checker-advocacy-money
title: "The law checker counts interest-group dues and drive donations that name a law as the law's own money"
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

**What.** The checker credits a post as a law's money when its journal id names the law key. Advocacy money names the law it argues about: interest-group dues and drive donations. In the rights-env year runs that credited the clean air plan in Prescott (`journal:2025-05-13:30902`, dues), the groundwater limit in Uehling (`journal:2025-02-11:7875`, dues), farmland protection in Uehling (`journal:2025-02-05:7671`, dues) and the abortion restriction in Prescott (`journal:2025-09-29:63210`, a drive donation) with money the law itself never moved. The housing family's loan cap money in Uehling is a campaign donation for the same reason.

**Rules.** An effect is a read: a law's money is a payment the law charges, pays or prices, not money people give to argue about it.

**Done when.** `scripts/law-wiring/check.ts` leaves dues, donations and other advocacy posts out of a law's cited money (by the post's source kind), and a rerun of the rights-env family in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) shows those four laws' money cells resting on the law's own payment or graded honestly, by journal id.

**Files.** scripts/law-wiring/check.ts, scripts/law-wiring/matrix.ts

**Notes.** From the laws lead, Oct 25, on the rights-env helper's report.
