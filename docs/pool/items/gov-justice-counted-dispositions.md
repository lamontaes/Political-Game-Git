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
lead: governing
standard: 2
model: opus
effort: high
root: design-one-model-two-tiers
checked: fable 2026-11-10
---

**What.** Carry the group incident rows of gov-justice-counted-incidents through the same steps a full person's case takes in the justice engine (`chargeDecision`, the plea, `convict`, sentencing, `decidePretrial`) as group counts: for each group the share charged, pleading, convicted and sentenced is the step's rule applied to the group's packed traits, income band and the law in force, times the count. Write group case rows that name the group, the law row and the step, and add the group's people in custody and serving a sentence to what `prisonersServing` and the budget's jail line read, so a county's corrections cost follows its counted prisoners as well as its named ones.

**Cause.** Found in code: `src/core2/modules/justice.ts` `chargeDecision` (line 665), `convict` (line 913) and sentencing, and `decidePretrial` (`src/core2/justice-pretrial.ts`, line 35), run for full people only; counted groups have no case rows. `prisonersServing` (line 1437) counts only named prisoners.

**Fix.** Apply the same steps to each counted group's packed traits and income times its count, write group case rows, and feed group custody counts to `prisonersServing` and the corrections budget line.

**Time box.** 8 hours for one opus session.

**Rules.** One model, two tiers: the same charging, plea, sentencing and bail rules run for a group as for a person, times its count, so a law changes both tiers alike. No dice: shares come from the group's traits, income, the evidence and the law in force, and real conviction rates only check the yearly totals. An effect is a read, not a record: the corrections budget line and the jail count must read the group rows. Ask why: a group case row cites the incident row, the law row and the sentencing range it used. Estimate, never UNKNOWN. Speed: a year is not more than 20 percent slower than before.

**Done when.** A second session plays a one-year world in a place drawn from all 56 with a seed the builder did not choose and sees group case rows show charges, convictions and sentences by group record id, the county's corrections spending read the counted prisoners by that row id, and two laws in force (cash bail ended and not ended) change the jail count; `src/core2/justice-counted.test.ts` proves it.

**Waits on.** gov-justice-counted-incidents.

**Files.** src/core2/modules/justice.ts, src/core2/justice-pretrial.ts, src/core2/justice-counted.ts (new), src/core2/modules/budgets.ts, src/core2/justice-counted.test.ts (new)

**Notes.** Oct 20 (pool feeder): part 2 of 3 of gov-justice-counted-cases.
