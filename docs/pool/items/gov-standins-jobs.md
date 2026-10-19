---
id: gov-standins-jobs
title: "Jobs-engine stand-ins replaced or relabeled as sourced estimates"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from gov-world-standins-oct14
---

**What.** PR #4146 (branch stopgaps/gov-world) relabeled or replaced 7 stopgap rows across several engines in one change, and it can no longer be merged: main moved on and 42 files conflict. This item redoes the jobs engine's rows against main's current files, one engine's worth at a time. For each row, either build the real mechanic and close the row, or turn the stand-in into a labeled estimate with its source and spread and state what replaces it. The rows are: SG-WORLD-jobs-opening-seekers, SG-WORLD-jobs-layoff-decider, SG-WORLD-jobs-benefits-terms, SG-WORLD-jobs-counted-choices, SG-WORLD-jobs-agreement-pinned, SG-WORLD-jobs-counted-retiree-income, SG-WORLD-jobs-benefits.

**Rules.** Placeholders: a row closes only when the real mechanic or a sourced, labeled estimate replaces the fake, never by deleting the row. Replace, never layer: the stand-in is deleted in the same change. Estimate, never UNKNOWN: a value a player can see starts from the real average with a spread and a source. One rule, all 56 places: the move names no place in code.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed and place named in the PR body) each listed row that is closed shows another engine reading what replaced it, by record id, and the rows still open in src/core2/data/stopgaps.json each carry a reason; the stopgap tripwire test and the tests for the changed engine pass.

**Files.** src/core2/modules/jobs.ts, src/core2/jobs-benefits.ts, src/core2/data/jobs/parameters.json, src/core2/data/stopgaps.json

**Notes.** Split Oct 19 from gov-world-standins-oct14 (see PR #5120 for the conflict list). The old branch stopgaps/gov-world holds the earlier attempt at each row; read its diff for the approach, then redo it on a fresh branch from main.
