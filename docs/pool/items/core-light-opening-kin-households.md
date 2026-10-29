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

**What.** Make kin a separate, optional step of the opening so the order can change. Today `buildPopulation` (src/core2/population.ts) builds kin for every household inside `openingFamilies`, before `buildDeepPast`, the player's pick (`entrantChoice`, which reads residents and never husks), `buildOpeningPeerContacts` and the kept set (`fullPeople` and `representativeSample`) are decided. Add an option so `buildPopulation` can leave kin out, and an exported step that adds kin for a given set of household ids; with every household passed, the opening input must hash the same as today. Deep past has to read family facts for the households that got kin, so list what in `buildDeepPast` and `enrichCivicInputs` needs kin first.

**Rules.** One model, two tiers: the set decides only who gets a full individual past; counted households are still read by every engine with the same rules. No dice: the entrant and the sample are drawn by the same seeded code as today, so the same people are kept.

**Done when.** In buildBenchWorld in a drawn place and a seed the builder did not choose (name both), a test beside src/core2/population-start-law.test.ts shows the opening input with kin added for every household has the same hash as the opening built in one step today, and a second case with kin left out has no husk people, parent-child links or family facts, by record id.

**Files.** src/core2/population.ts, src/core2/residents.ts, src/bench/world.ts, src/core2/representative-sample.ts

**Notes.** Measured: Vonore, Tennessee (seed hours-a) gives every one of 4,373 households relatives, so the wider population grows from 9,940 to 39,685 people (docs/coordination/core.md, OPUS-PEOPLE note). Profile of one opening: openingFamilies 8.8 s, opening-kin 3.6 s, opening-personality 3.1 s, falling-outs 2.0 s.
