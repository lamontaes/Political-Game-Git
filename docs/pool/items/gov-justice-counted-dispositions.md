---
id: gov-justice-counted-dispositions
title: "Counted incident groups reach charges, pleas, convictions and sentences, and fill the jail and prison counts"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: gov-justice-counted-incidents
blocked-on:
milestone:
source: split from gov-justice-counted-cases by pool feeder Oct 20
---

**What.** Carry the group incident rows of gov-justice-counted-incidents through the same steps a full person's case takes in src/core2/modules/justice.ts (chargeDecision, the plea, convict, sentencing, decidePretrial) as group counts: for each group the share charged, pleading, convicted and sentenced is the step's rule applied to the group's packed traits, income band and the law in force, times the count. Write group case rows that name the group, the law row and the step, and add the group's people in custody and serving a sentence to what prisonersServing and the budget's jail line read, so a county's corrections cost follows its counted prisoners as well as its named ones.

**Rules.** One model, two tiers: the same charging, plea, sentencing and bail rules run for a group as for a person, times its count, so a law changes both tiers alike. No dice: shares come from the group's traits, income, the evidence and the law in force, and real conviction rates only check the yearly totals. An effect is a read, not a record: the corrections budget line and the jail count must read the group rows. Ask why: a group case row cites the incident row, the law row and the sentencing range it used. Estimate, never UNKNOWN: sentencing ranges come from the sourced justice parameters.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, group case rows show charges, convictions and sentences by group record id, the county's corrections spending reads the counted prisoners by that row id, and two laws in force (cash bail ended and not ended) change the jail count; src/core2/justice-counted.test.ts proves it and the year is not more than 20 percent slower than before.

**Files.** src/core2/modules/justice.ts, src/core2/justice-pretrial.ts, src/core2/justice-counted.ts, src/core2/modules/budgets.ts, src/core2/justice-counted.test.ts

**Notes.** Oct 20 (pool feeder): part 2 of 3 of gov-justice-counted-cases.
