---
id: core-year-crash-outside-obligation
title: 'A played year stops: "Outside obligation refers to missing, inactive or unmatched recipient terms" (Wakonda, South Dakota)'
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: claude/year-crash-outside-obligation
pr:
blocked-on:
source: "words-needs-words-60 triage, Oct 16"
claimed-at: 2026-10-16T09:25:06.277Z
---

**What.** A two-level bench world in Wakonda, South Dakota (`node --import tsx scripts/dialogue-batch/scene-year.ts --seed w15-c`, place 4668100) throws "Outside obligation refers to missing, inactive or unmatched recipient terms." from `runFinanceDay` (`src/core2/finance-cash.ts:1697`) partway through its year. The world cannot finish a year there, so the owner would see a crash. Find the outside obligation whose recipient terms went missing, say why by record id, and fix the engine that wrote or ended them.

**Rules.** One rule, all 56 places: the fix reads data for every place, and the repro place is only a repro. Speed: a town's game year stays under two minutes. Ask why: the failing record is named in the fix.

**Done when.** In the repro place and in a second drawn place (names and seeds in the PR body) a one-year run of the played world (buildBenchWorld) finishes with no throw, shown by the run's final date, and the finance and the engine's own test for the cause pass. Reproduce first: run the repro on current main; if it no longer throws, close the item with the run's place and seed.

**Files.** src/core2/finance-cash.ts, the module that ends the recipient terms

**Notes.** From the Words session's notes (core words.md, Oct 15).

Checked 2026-10-16 (claude session) on current main: does not reproduce. `node --import tsx scripts/dialogue-batch/scene-year.ts --seed w15-c` (Wakonda, South Dakota, place 4668100) runs its 365 days, and so do two-level bench worlds in Wakonda (seed w15-c) and Bonita Springs, Florida (place 1207525, `drawPlace("rand-out-2", "outside")`), each from the game start (2025-01-20) to 2026-01-20 with no throw. The report predates the move of the game start to January 20, 2025. Closing with those runs; reopen with a seed, place and start date if it returns.
