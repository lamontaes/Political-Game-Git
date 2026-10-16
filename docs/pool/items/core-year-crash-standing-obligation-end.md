---
id: core-year-crash-standing-obligation-end
title: 'A played year stops: "Only a current standing obligation can end" (Waterford, California)'
area: core
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/core-year-crash-standing-obligation-end
pr: #4668
blocked-on:
source: "words-needs-words-60 triage, Oct 16"
claimed-at: 2026-10-16T09:23:04.897Z
---

**What.** A two-level bench world in Waterford, California (the first place drawn for `dialogue:coverage --seed batch-10-r2`) throws "Only a current standing obligation can end." partway through its year, from `endStandingContract` in `src/core2/finance-state.ts`. Something ends a lease or standing bill that was already ended or is not a standing obligation (a recipient income or a sales budget). Find it by record id and fix the caller.

**Rules.** One rule, all 56 places: the fix reads data for every place, and the repro place is only a repro. Speed: a town's game year stays under two minutes. Ask why: the failing record is named in the fix.

**Done when.** In the repro place and a second drawn place (names and seeds in the PR body) a one-year run of the played world (buildBenchWorld) finishes with no throw, shown by the final date, and the finance state test passes. Reproduce first: run the repro on current main; if it no longer throws, close the item with the run's place and seed.

**Files.** src/core2/finance-state.ts, src/core2/modules/housing.ts

**Notes.** From the Words session's notes (Oct 14).
