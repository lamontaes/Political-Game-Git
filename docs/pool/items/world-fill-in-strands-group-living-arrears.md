---
id: world-fill-in-strands-group-living-arrears
title: "A fill-in takes a household's share of its group's money but not its share of the group's living arrears, so the arrears are stranded on an empty group (living-costs-arrears red by draw)"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: red-main
---

**What.** src/core2/living-costs-arrears.test.ts fails its both-tiers test on clean main with GOLDEN_PATH_SEED=wf-arr-3 (place 0118952, US-AL, world seed cde228114c13c57e95bf40f5b8c7b9b101238c2ad6d661f2f7de336ea0e4b316): on 2025-08-19 the counted flows carry 632354 in arrears against the groups' 699328. Cause by record: on 2025-07-27 both households of counted group 9 (group:jurisdiction_db391ce7fb2cb22b:town:one-adult:income-0:rent:18-29:not-working), household_c2a0307017b9de7a and household_c2851e7017a2f82c, were filled in while the group owed 66974 in rt.livingArrears. The group's people and fund went to 0 and its weight in residents:outside-living:counted:jurisdiction_db391ce7fb2cb22b fell from 75198 to 0, so chargeGroups never asks it again and the flow's arrearsMinor leaves out exactly 66974 (699328 minus 632354). The fill-in moves the household's share of the group's money (fillInCash) but not its share of the group's living arrears.

**Rules.** One model, two tiers: a filled-in household carries what its counted weight owed, as it carries what the weight held. Wire to the world: arrears are owed by a household that exists, never by an empty group. Ask why by record: name the group, the households and the amount moved. Fix at the root in the fill-in, never by loosening the test's comparison.

**Done when.** On GOLDEN_PATH_SEED=wf-arr-3 (0118952, US-AL) living-costs-arrears.test.ts passes, and the PR names the filled-in households that now carry group 9's 66974 by household id; the test passes on two fresh drawn places named with their seeds; a counted group with no people left owes no living arrears after a fill-in in a one-year played world (buildBenchWorld).

**Files.** src/core2/modules/residents.ts, src/core2/counted-money.ts, src/core2/living-costs-arrears.test.ts

**Notes.** Found Oct 29 by the laws lead's medical-debt helper, which ran the same seed on the medical branch and on clean main (01b2ca6c55) with identical numbers, so it is main's, not the medical branch's. Related: world-counted-household-arrears-take-whole-paycheck.
