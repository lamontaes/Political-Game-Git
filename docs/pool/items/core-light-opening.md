---
id: core-light-opening
title: "Counted households get only what the counts need at the opening"
area: core
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/light-opening
pr: #5079
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-19T18:24:48.939Z
---

**What.** `buildOpeningKin` and personality still run for every household at the opening (about half of the 12 s open). Take a `countedHouseholdIds`-style option decided before generation so counted households get only ages, household, job, cash and living cost, and build kin and past on demand at fill-in. The saving is meant to take a few seconds off the opening and keep a clicked counted person consistent with the records.

**Rules.** One model, two tiers: counted households are read by the engines with the same rules as full people. Speed: a town's game year runs in under two minutes.

**Done when.** A drawn-place opening in buildBenchWorld (Vonore, seed hours-a, or another named) shows kin and personality records only for the player's circle, the open time before and after on one machine in the PR, and a clicked counted person filled in with kin by record id.

**Files.** src/core2/population.ts, src/core2/opening-kin.ts, src/core2/state.ts

**Notes.** core.md lines 210 and 219, checked Oct 15. Overlaps core-m7-01-speed-and-memory.

Looked at Oct 18 (claude/light-opening, nothing built). Timed a drawn opening (buildBenchWorld, twoLevel, seed hours-a, this 4-core container): 29.8 s in all, 15.7 s of it building the population, and `openingFamilies` is 9.5 s of a 34 s profile (`buildOpeningKin` 4.5 s, `openingTemperaments` 2.9 s). So the saving is real. It cannot be taken by skipping kin for counted households, for two reasons found in the records:

- **The kin households are the wider population at county and state level.** In that opening 23,973 of the 28,219 counted households are relatives' households placed in the county or the state, and only 4,246 are the town's own. Dropping them removes most of the counted people outside the town. The moves engine reads relatives' places for where a person goes (`modules/moves.ts`, destination from a relative's place), so arrivals and departures would change. Whether the counted wider world should keep being seeded from residents' relatives is the owner's call; it needs a ruling before this item is built.
- **Counted people's temperament reads their kin.** `openingTemperaments` passes a resident's outside parents' inherited share down. A counted resident built without kin draws unseen parents instead, which keeps the spread but changes every counted value, and a filled-in person's relatives would no longer be heritable from them.

Two ways forward that change no output: speed up `buildOpeningKin` (`moveHazard` is 0.8 s, recomputed in loops) and `openingTemperaments` and prove it by hash on three drawn places, or rule that the county and state counted population is generated from the census directly, not from residents' relatives, and then build this item against that.
