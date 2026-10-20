---
id: gov-redistricting-census-count
title: "The game counts its own people each tenth year and apportions House seats from the count"
area: gov
kind: feature
priority: 3
size: M
status: claimed
claimed-by: claude/peaceful-ritchie-03780x
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:54:10.768Z
---

**What.** In years ending in 0, count each place's people from the world's own population (reference population plus recorded drift and flows); in years ending in 1 call apportionHouse over the state counts and electoralVotesFromSeats, and write a dated set selectDatedSet reads, as the 2026 lines work. Neighborhood shares drift with the recorded moves, never re-read from 2020.

**Rules.** No dice; one rule, all 56 places; no race, ethnicity or language field on any person; an effect is a read; the Political Process baseline and golden path come first, so this is not needed for early access play (docs/roadmap/political-process-baseline.md does not list redistricting; owner D-6 and Sept 28 #8 ask for it).

**Done when.** A 30-year run in a drawn state shows a seat gained or lost from the game's own counts, by a test census-count.test.ts naming the place and seed.

**Files.** src/simulation/apportionment.ts, src/districts/place-membership.ts, src/core2/ (new census module)

**Notes.** Split Oct 19 (claude/peaceful-ritchie-03780x) from gov-redistricting-engine using the parts of docs/codex/specs/bank/b16-redistricting-vra.md (old-core file references; port only what is used). The spec's open question for the owner (how many plans a legislator sees: 3 to 4 ready-made plans is recommended) is built as the recommended answer unless he rules otherwise.

First piece built Oct 19 (claude/peaceful-ritchie-03780x): `apportionHouse` in src/core2/apportionment.ts, the method of equal proportions with exact BigInt tie-breaking, and src/core2/apportionment.test.ts, which reproduces every state's 2020 seats from data/research/apportionment/apportionment-2020.json and shows a seat moving from one state to another when a state's count grows. The old src/simulation/apportionment.ts is gone, so this is the only copy. Left: the game's own census, which needs state population counts for 2030 and later. The world models one town in detail and the rest of the nation coarsely, and no state-level population path exists yet (no state counts in src/core2/data beyond the 2020 table and population-2024.json). Choose one: a state-population path for the coarse nation (the item that owns the national economy), or a controlled census step in the test that supplies counts, as the done-when allows ("or a controlled census step").

Second piece built Oct 19 (claude/peaceful-ritchie-03780x): `censusCounts(year)` and `censusSeats(year)` in src/core2/census.ts. Each state's apportionment population in a census year is its BEA resident population carried forward at its 2020 to 2024 growth rate (src/core2/data/census/state-population-path.json, built by src/core2/tooling/build-state-population-path.ts from data/source/bea-regional/raw/CAINC1.zip and the 2020 apportionment table), times the share of its apportioned people counted though not resident; ESTIMATED. src/core2/census-count.test.ts: the 2020 census reproduces the 2020 seats, and the 2030 census gives Texas and Florida seats and takes them from California and New York with the House staying 435. Not met: a played-world run that reads the seats (an effect is a read): nothing in src/core2 uses `censusSeats` yet, and the town's own residents do not enter the state count (the nation beyond the town is coarse). The reader is filed as gov-redistricting-census-seats-read. Leaving this item open until that reader exists.
