---
id: core-light-opening
title: "Counted households get only what the counts need at the opening"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
---

**What.** `buildOpeningKin` and personality still run for every household at the opening (about half of the 12 s open). Take a `countedHouseholdIds`-style option decided before generation so counted households get only ages, household, job, cash and living cost, and build kin and past on demand at fill-in. The saving is meant to take a few seconds off the opening and keep a clicked counted person consistent with the records.

**Rules.** Two-level population: counted households are read by the engines with the same rules as full people. Speed: a town's game year runs in under two minutes.

**Done when.** A drawn-place opening in buildBenchWorld (Vonore, seed hours-a, or another named) shows kin and personality records only for the player's circle, the open time before and after on one machine in the PR, and a clicked counted person filled in with kin by record id.

**Files.** src/core2/population.ts, src/core2/opening-kin.ts, src/core2/state.ts

**Notes.** core.md lines 210 and 219, checked Oct 15. Overlaps core-m7-01-speed-and-memory.
