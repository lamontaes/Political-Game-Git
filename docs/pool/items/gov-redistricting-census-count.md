---
id: gov-redistricting-census-count
title: "The game counts its own people each tenth year and apportions House seats from the count"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In years ending in 0, count each place's people from the world's own population (reference population plus recorded drift and flows); in years ending in 1 call apportionHouse over the state counts and electoralVotesFromSeats, and write a dated set selectDatedSet reads, as the 2026 lines work. Neighborhood shares drift with the recorded moves, never re-read from 2020.

**Rules.** No dice; one rule, all 56 places; no race, ethnicity or language field on any person; an effect is a read; the Political Process baseline and golden path come first, so this is not needed for early access play (docs/roadmap/political-process-baseline.md does not list redistricting; owner D-6 and Sept 28 #8 ask for it).

**Done when.** A 30-year run in a drawn state shows a seat gained or lost from the game's own counts, by a test census-count.test.ts naming the place and seed.

**Files.** src/simulation/apportionment.ts, src/districts/place-membership.ts, src/core2/ (new census module)

**Notes.** Split Oct 19 (claude/peaceful-ritchie-03780x) from gov-redistricting-engine using the parts of docs/codex/specs/bank/b16-redistricting-vra.md (old-core file references; port only what is used). The spec's open question for the owner (how many plans a legislator sees: 3 to 4 ready-made plans is recommended) is built as the recommended answer unless he rules otherwise.
