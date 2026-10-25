---
id: core-old-engine-06-place-lookup-and-scripts
title: "The place-lookup builder, data/tables and the eight exporter scripts stop reading or writing src/simulation"
area: core
kind: cleanup
priority: 1
size: M
status: open
claimed-by:
pr:
after: core-old-engine-05-health-onset-lift
blocked-on: play-first-freeze
source: "docs/reports/repo-audit-2026-10-19.md section A (jobs the two-jobs list missed) and G2 step 8"
---

**What.** This item records the October19 audit snapshot at `0104686`; its paths and counts require a current check before implementation. The audit found jobs the "two jobs" list missed. `src/core2/tooling/build-place-lookup-data.ts` imports `legislation-scenarios`, `demo-jurisdiction-context`, `legislature-rule-packs`, `legislative-work-key`, `seats-of-government.generated` and `state-reference` from the old core (draft #5032 open); `src/core2/tooling/build-opening-schools.ts` takes one type; `data/tables/index.ts` type-imports six old generated tables. Eight scripts still import it: `scripts/source/{export-data-tables, export-town-council-profile-inputs, executive-authority-r3h-reconciliation, school-name-patterns}`, `scripts/source/regional-money/export-office-pay`, `scripts/world/compile-area-residents`, `scripts/english-corpus/grading-batch-speech` and `scripts/prose-corpus/sources/episodes`, and four of them write their output into `src/simulation/` (`office-pay.generated.ts`, `school-name-patterns.json`, `area-residents.generated.ts`, `town-council-profile-inputs.generated.ts`). Re-home the rule packs, seats of government and state reference under `src/core2/reference/`, the generated tables under `data/tables/`, and point each script's input and output there.

**Rules.** Replace, never layer: each re-homed file deletes its old-core original and the exporters' old output paths in the same PR, counted in the body. The new core is the engine: no script writes into `src/simulation`. One rule, all 56 places: rule packs and seats of government stay per-state data read by core2, not branches on a state name. Recheck the present import graph and existing pool claims before removing or moving any path; preserve current consumers, guards and provenance.

**Done when.** `grep -rn "simulation/" src/core2/tooling/ data/tables/ scripts/source/ scripts/world/ scripts/english-corpus/ scripts/prose-corpus/` returns nothing; each of the eight scripts runs to its new output path; `tests/data-tables.test.ts`, `tests/seat-of-government-places.test.ts` and `tests/starting-law-term-completeness.test.ts` pass against the new homes; a drawn place from `buildBenchWorld` resolves its seat of government and rule pack from `src/core2/reference/`.

**Files.** src/core2/tooling/build-place-lookup-data.ts, src/core2/tooling/build-opening-schools.ts, data/tables/index.ts, scripts/source/export-data-tables.ts, scripts/source/export-town-council-profile-inputs.ts, scripts/source/executive-authority-r3h-reconciliation.ts, scripts/source/school-name-patterns.ts, scripts/source/regional-money/export-office-pay.ts, scripts/world/compile-area-residents.ts, scripts/english-corpus/grading-batch-speech.ts, scripts/prose-corpus/sources/episodes.ts, src/core2/reference/

**Notes.** Covers the audit's pool rows `core-old-imports-tooling` (change) and `core-rehome-old-exporters` (new). Draft #5032 carries the place-lookup part; finish on that branch. Parent: core-delete-old-engine.

Frozen Oct 24 (play first): not claimable until the CTO lifts the freeze (play-first-freeze; docs/work-orders/play-first-2026-10-24.md).
