---
id: core-light-opening-kin-households
title: "The opening names which households need kin before it generates any: the player's, the public workers' and the sample's"
area: core
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: split from core-light-opening (M, really L) by the claiming session, Oct 19
claimed-at:
---

**What.** Decide, from the resident household plans alone, the set of households that will stay full people: the entrant's household, the households of public workers and the representative sample. Today the entrant is picked after kin exist (entrantChoice in src/bench/world.ts reads residents, never husks), so the decision can move before generation without changing who is picked. Expose it as an option on the population builder, such as keptHouseholdIds, and pass it unchanged to the later steps.

**Rules.** One model, two tiers: the set decides only who gets a full individual past; counted households are still read by every engine with the same rules. No dice: the entrant and the sample are drawn by the same seeded code as today, so the same people are kept.

**Done when.** In buildBenchWorld in a drawn place and a seed the builder did not choose (name both), a test in src/core2 shows the set computed from plans equals the set of households that fullPeople keeps after collapseToTwoLevels today, listing household ids and the entrant's id.

**Files.** src/core2/population.ts, src/core2/residents.ts, src/bench/world.ts, src/core2/representative-sample.ts

**Notes.** Measured: Vonore, Tennessee (seed hours-a) gives every one of 4,373 households relatives, so the wider population grows from 9,940 to 39,685 people (docs/coordination/core.md, OPUS-PEOPLE note). Profile of one opening: openingFamilies 8.8 s, opening-kin 3.6 s, opening-personality 3.1 s, falling-outs 2.0 s.
