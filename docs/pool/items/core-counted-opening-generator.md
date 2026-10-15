---
id: core-counted-opening-generator
title: "A town's opening residents above the full-person budget are generated as counted households, not full people"
area: core
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "split from core-town-size-census"
---

**What.** `buildPopulation` (src/core2/population.ts) builds every opening person as a full record, then `collapseToTwoLevels` turns most of them into counted households. That is why the opening stops at 10,000 (`targetPopulation`, population.ts:512-519). Generate the people above the full-person budget directly as counted households (`ResidentHouseholdRecord`) from the place's Census and ACS counts (household mix, age, job, income), skipping the full-person step. The full-person set (the player, their circle, officials, the first 10,000-person cohort or less) is built as now.

**Rules.** Two-level population (counts, not individuals, for the wider population); no dice; estimate, never UNKNOWN; one rule, all 56 places; a filled-in person must match what the records already say.

**Done when.** For a drawn place above 10,000, the generator returns counted households whose people total the place's Census count minus the full people, and building and collapsing takes under 2x the time of a 10,000-person opening. Tested in three drawn places above 10,000 (a seed the builder did not choose).

**Files.** src/core2/population.ts, src/core2/counted-groups.ts, src/core2/household-mix.generated.ts

**Notes.** Measured on Johnstown, Colorado (22,433): opening at the 10,000 cap takes 42 s and 2.9 GB; with `minimumPeople` set to 22,433 it takes 105 s and 4.7 GB. The largest place, New York, New York, has 8,584,629 people, so full-record generation cannot scale; 4,274 of 32,394 localities are above 10,000.
