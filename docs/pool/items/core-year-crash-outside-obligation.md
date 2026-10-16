---
id: core-year-crash-outside-obligation
title: 'A played year stops: "Outside obligation refers to missing, inactive or unmatched recipient terms" (Wakonda, South Dakota)'
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "words-needs-words-60 triage, Oct 16"
---

**What.** A two-level bench world in Wakonda, South Dakota (`node --import tsx scripts/dialogue-batch/scene-year.ts --seed w15-c`, place 4668100) throws "Outside obligation refers to missing, inactive or unmatched recipient terms." from `runFinanceDay` (`src/core2/finance-cash.ts:1697`) partway through its year. The world cannot finish a year there, so the owner would see a crash. Find the outside obligation whose recipient terms went missing, say why by record id, and fix the engine that wrote or ended them.

**Rules.** One rule, all 56 places: the fix reads data for every place, and the repro place is only a repro. Speed: a town's game year stays under two minutes. Ask why: the failing record is named in the fix.

**Done when.** In the repro place and in a second drawn place (names and seeds in the PR body) a one-year run of the played world (buildBenchWorld) finishes with no throw, shown by the run's final date, and the finance and the engine's own test for the cause pass. Reproduce first: run the repro on current main; if it no longer throws, close the item with the run's place and seed.

**Files.** src/core2/finance-cash.ts, the module that ends the recipient terms

**Notes.** From the Words session's notes (core words.md, Oct 15).
