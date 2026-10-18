---
id: world-counted-renters-buy
title: "Counted renter households weigh buying a home by the same rule as full households"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-renters-can-choose-to-buy
source: split of world-home-turnover (Oct 18)
---

**What.** `buyHomes` loops only the full households' `lease:` contracts, so the 639 counted renter households in Selmer, Tennessee (seed 986bb7deee878a6858b40f821e2883c9eed1129a1c6092c0a289e155c7b3b72a) never weigh buying, although the housing opening gives them dwelling rows and `rent:` flows. A counted renter group must be read with the same rule as a full household, times its count: the same payment, the same down payment against its savings, the same bank yes. Buyers leave the renter count, join the owners with a mortgage, and are written as a counted purchase the group's records keep.

**Rules.** One model, two tiers: a counted group is read by the same rule as a full person, times its count; a rule that applies only to full households is an unregistered placeholder. Wire to the world: the down payment and the loan move by journal record. No dice: the group buys from its members' incomes and savings, never a fixed share.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, twoLevel, a drawn place from all 56, seed named in the PR body) counted renter groups buy in a number consistent with the full households' rate per thousand renters, a counted purchase is traced by record id from the group's lease to its mortgage row and the bank's balance, and a test in src/core2 names the place and seed.

**Files.** src/core2/modules/housing.ts, src/core2/housing-mortgages.ts, src/core2/housing-occupancy.ts

**Notes.** Found Oct 18 splitting world-home-turnover. Counted rent is the flow `rent:<householdId>` (housing-occupancy.ts), not a standing `lease:` contract.
