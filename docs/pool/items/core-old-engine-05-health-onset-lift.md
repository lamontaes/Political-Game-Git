---
id: core-old-engine-05-health-onset-lift
title: "conditionOnsetDay and STRAIN_THRESHOLD move into core2 so the mortality calibration test checks the game's code"
area: core
kind: cleanup
priority: 1
size: S
status: open
claimed-by:
pr:
after: core-old-engine-04-opening-population-no-throwaway-world
blocked-on:
source: "docs/reports/repo-audit-2026-10-19.md section A (health condition pack) and G2 step 7"
---

**What.** This item records the October19 audit snapshot at `0104686`; its paths and counts require a current check before implementation. The audit confirmed the game does not use the old health condition pack: `src/core2/condition-pack.ts` and `src/core2/modules/health.ts` already own conditions and onsets. The only users of the old code are the calibration fixture `tests/fixtures/synthetic-cohort.ts`, which calls the old `conditionOnsetDay` (`crisis/condition-pack`) and `STRAIN_THRESHOLD` (`crisis/mortality`), so `tests/mortality-calibration.test.ts` currently calibrates old-engine code and not the game's onset path, and the dead script `scripts/dev-lab/expected-deaths.ts`. Lift `conditionOnsetDay` (about 45 lines) into `src/core2/condition-pack.ts`, or point the fixture at the onset function `modules/health.ts` already uses, and `STRAIN_THRESHOLD` (4 lines) into `src/core2/health-hazard.ts`; re-point the fixture; delete `expected-deaths.ts`. The whole of `src/simulation/crisis/` (6.1 MB, including the 5.8 MB `storm-catalog.generated.json`) then has no live importer.

**Rules.** Replace, never layer: the old `crisis/condition-pack.ts` and `crisis/mortality.ts` are deleted in the same PR as the lift, and `src/simulation/crisis/` goes with step 7 at the latest. No dice: onset is a read of the person's hazard record, as `modules/health.ts` does today. Every number has a source: `STRAIN_THRESHOLD` carries its source comment across with it. Recheck the present import graph and existing pool claims before removing or moving any path; preserve current consumers, guards and provenance.

**Done when.** `grep -rn "simulation/" tests/fixtures/synthetic-cohort.ts tests/mortality-calibration.test.ts` returns nothing; `scripts/dev-lab/expected-deaths.ts` no longer exists; `tests/mortality-calibration.test.ts` passes against `src/core2/condition-pack.ts` and `src/core2/health-hazard.ts`; a played-world year in a drawn place from `buildBenchWorld` records onsets through the same core2 path.

**Files.** src/core2/condition-pack.ts, src/core2/health-hazard.ts, src/core2/modules/health.ts, tests/fixtures/synthetic-cohort.ts, tests/mortality-calibration.test.ts, scripts/dev-lab/expected-deaths.ts, src/simulation/crisis/condition-pack.ts, src/simulation/crisis/mortality.ts

**Notes.** The audit's pool row `core-port-onset-day`; this id replaces it. Parent: core-delete-old-engine.
