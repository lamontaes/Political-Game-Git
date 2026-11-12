---
id: core-light-opening-kin-households
title: "The opening names which households need kin before it generates any: the player's, the public workers' and the sample's"
area: core
kind: feature
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-core-light-opening-kin-households
pr: #8622
after:
blocked-on:
source: split from core-light-opening (M, really L) by the claiming session, Oct 19
claimed-at: 2026-11-11T05:19:55.224Z
lead: m0-m2
standard: 2
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-10
---

**What.** Make kin a separate, optional step of the opening so the order can change. Today `buildPopulation` (src/core2/population.ts) builds kin for every household inside `openingFamilies`, before `buildDeepPast`, the player's pick (`entrantChoice`, which reads residents and never husks), `buildOpeningPeerContacts` and the kept set (`fullPeople` and `representativeSample`) are decided. Add an option so `buildPopulation` can leave kin out, and an exported step that adds kin for a given set of household ids; with every household passed, the opening input must hash the same as today. Deep past has to read family facts for the households that got kin, so list what in `buildDeepPast` and `enrichCivicInputs` needs kin first.

**Cause.** Found in code: src/core2/population.ts `buildPopulation` builds kin for every household inside `openingFamilies` (`buildOpeningKin` imported at line 118, called at line 1660) before the kept set is decided. Measured: Vonore, Tennessee (seed hours-a) gives every one of 4,373 households relatives, growing the wider population from 9,940 to 39,685.

**Fix.** Make kin a separate optional step with an exported adder for given household ids. With every household passed, the opening input must hash the same as today. List what in the deep past and `enrichCivicInputs` needs kin first.

**Time box.** 3 hours for a Sonnet session.

**Rules.** One model, two tiers: the set decides only who gets a full individual past; counted households are still read by every engine with the same rules. No dice: the entrant and the sample are drawn by the same seeded code as today, so the same people are kept.

**Done when.** A second session, in buildBenchWorld in a drawn place and a seed the builder did not choose (both named), runs a test beside src/core2/population-start-law.test.ts that shows the opening input with kin added for every household has the same hash as the opening built in one step today, and a second case with kin left out has no husk people, parent-child links or family facts, by record id.

**Waits on.** Nothing.

**Files.** src/core2/population.ts, src/core2/residents.ts, src/bench/world.ts, src/core2/representative-sample.ts, src/core2/population-start-law.test.ts

**Notes.** Measured: Vonore, Tennessee (seed hours-a) gives every one of 4,373 households relatives, so the wider population grows from 9,940 to 39,685 people (docs/coordination/core.md, OPUS-PEOPLE note). Profile of one opening: openingFamilies 8.8 s, opening-kin 3.6 s, opening-personality 3.1 s, falling-outs 2.0 s.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:48 UTC) on branch claude/pool-core-light-opening-kin-households.

Released (2026-11-11): a builder claimed this and did not start it (its draft said so and left the claim in place); Fable B released it so another builder can take it.
