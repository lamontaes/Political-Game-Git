---
id: world-rental-match-reads-commute-and-space
title: "Who takes a new rental weighs the commute to recorded jobs and the room a family needs"
area: world
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-dwelling-locations
source: added with npm run pool -- add
---

**What.** src/core2/housing-occupancy.ts matches completed rentals to rent-saving tenants, recovered homeless households and unassigned households by rent, income and cash only. Add the two missing reads: the commute from the dwelling to the household's recorded job locations, and whether the dwelling's capacity fits the household's size, with the same decision rule for both tiers. Closes SG-WORLD-new-rental-move-coverage once dwelling capacity is recorded.

**Rules.** One model, two tiers: counted households weigh commute and space by the same rule as full households, times their count. No dice: the match follows recorded jobs, sizes and money.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and seed named), a household that moves into a new rental cites the commute or space term in its recorded move reasons by record id, and src/core2/housing-occupancy.test.ts shows a larger family preferring the larger unit at equal rent.

**Files.** src/core2/housing-occupancy.ts, src/core2/housing-occupancy.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-WORLD-new-rental-move-coverage; waits on dwelling locations for the commute half.
