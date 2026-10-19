---
id: gov-redistricting-engine
title: "Redistricting after each census, drawn by whoever the state's law says, read from the independent-redistricting law"
area: gov
kind: feature
priority: 3
size: L
status: blocked
claimed-by: claude/peaceful-ritchie-03780x
pr:
blocked-on: gov-redistricting-who-draws
milestone:
source: "split from laws-family-government-operations; stopgap SG-GOV-REACH-A-redistricting; owner D-6 (approved) and Sept 28 #8"
claimed-at: 2026-10-19T23:51:06.707Z
---

**What.** After a census the game recounts its people, seats shift between states, and the maps are redrawn: council wards, state legislative districts and U.S. House districts, by whoever the state's law names (legislature, independent commission, council). The independent-redistricting law decides who holds the pen. Neighborhood makeup comes from Census place data and is used the way courts use it under the Voting Rights Act; it is never a label on a person.

**Rules.** The Political Process baseline and golden path come first: this is not needed for early access play, so check `docs/roadmap/political-process-baseline.md` before building. No dice; one rule, all 56 places; no race or language field on any person; an effect is a read. Split into bounded items before building (size L).

**Done when.** A played decade (or a controlled census step) in a drawn place redraws a map by the law in force, cited by record id, and the stopgap row SG-GOV-REACH-A-redistricting is resolved.

**Files.** src/core2 (new districting engine), src/districts, src/core2/data/laws/reach-group-a.json.

**Notes.** Spec: docs/codex/specs/bank/b16-redistricting-vra.md (old-core file references; port only what the golden path uses). Today no engine in src/core2 draws a district.

Split Oct 19 (claude/peaceful-ritchie-03780x) into gov-redistricting-neighborhood-data, gov-redistricting-census-count, gov-redistricting-plan-builder, gov-redistricting-who-draws, gov-redistricting-map-challenge and gov-redistricting-plan-screen, from the parts of docs/codex/specs/bank/b16-redistricting-vra.md. This item is done when they are.
