---
id: core-opening-no-17-year-old
title: "A small place opens with no 17-year-old, and the opening throws (Utica, Montana; Buffalo Prairie, Illinois)"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "words-needs-words-60 triage, Oct 16"
---

**What.** `buildPopulation` throws "No household of Utica, Montana holds a resident aged 17." (seed w15-s) and the same for Buffalo Prairie, Illinois (place key 1709499, `src/core2/population.ts:724`). A small town may have none of that age, so the opening must not demand one: the golden-path check and any run that draws such a place fail. Choose the player's starting household by a rule that works for every place (the nearest age the town has), with the age it took on the record.

**Rules.** One rule, all 56 places: the starting age rule reads the town's own ages, never a named place. Estimate, never UNKNOWN: if the exact age is missing the nearest is used and says so.

**Done when.** In both repro places and a drawn place (names and seeds in the PR body) the opening builds with a player household and its age by record id, buildBenchWorld opens, and the golden-path M0-13 check passes. Reproduce first: run the repro on current main; if it no longer throws, close the item with the run's place and seed.

**Files.** src/core2/population.ts, src/bench/world.ts

**Notes.** From the Words session's notes (Oct 14 and Oct 15). The played world never opens in such a place today.
