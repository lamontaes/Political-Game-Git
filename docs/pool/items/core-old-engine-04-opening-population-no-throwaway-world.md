---
id: core-old-engine-04-opening-population-no-throwaway-world
title: "The opening population writes people, households and jobs straight into core2, with no throwaway old-engine world"
area: core
kind: cleanup
priority: 1
size: M
status: in-pr
claimed-by:
pr: #6637
after: core-old-engine-03-schedules-jobs-traits-history
blocked-on:
source: "docs/reports/repo-audit-2026-10-19.md section A and G2 step 6"
---

**What.** This item records the October19 audit snapshot at `0104686`; its paths and counts require a current check before implementation. The audit confirmed that `buildPopulation()` in `src/core2/population.ts` (1,644 lines) builds a throwaway old-engine World with `createWorld`, `assertWorldIntegrity` and `writeWithWorldIntegrityOnce` (a scratch World "never advanced or returned"), writes people, households and town jobs into it with old-engine code, then copies them into a core2 `CoreInput`. Core2 already does the surrounding work itself in its 60+ `opening-*` files (`opening-kin`, `opening-partnership`, `opening-personality`, `opening-income`, `opening-staffing`, `household-mix`, `person-names`, `trait-source`, `condition-pack`). Replace the scratch `createWorld` target with a plain core2 builder target in `population.ts`, drop the old household, kinship and partner types for core2's own, and delete the `releaseRecentHistory` and `forgetLastValidatedWorld` calls (old-world memory caches) in `src/bench/world.ts` and `src/core2/tooling/generated-world.ts`. Then `world.ts`, `types.ts` and `history-index.ts` have no live importer and go.

**Rules.** Replace, never layer: `world.ts`, `types.ts` and `history-index.ts` are deleted in the same PR that removes their last import, and the PR body counts the files removed. The new core is the engine: the opening town is built by core2 code only, nothing passes through an old World. No dice: every draw in the builder stays a read of the place record and the corpus, as it is today. Recheck the present import graph and existing pool claims before removing or moving any path; preserve current consumers, guards and provenance.

**Done when.** `grep -rn "simulation/" src/core2/population.ts src/bench/world.ts src/core2/tooling/generated-world.ts` returns nothing; `src/simulation/world.ts`, `types.ts` and `history-index.ts` no longer exist; a drawn place built by `buildBenchWorld` gives the same town by record id (people, households, jobs) before and after; `src/core2/population.test.ts`, the golden-path suite and the speed guard pass.

**Files.** src/core2/population.ts, src/bench/world.ts, src/core2/tooling/generated-world.ts, src/simulation/world.ts, src/simulation/types.ts, src/simulation/history-index.ts

**Notes.** This is the audit's step 6 and the pool item `core-port-world-scaffold`, which was blocked until steps 2–5 landed; this item carries it. Parent: core-delete-old-engine.

Old engine session, Oct 28: PR #6637 (branch claude/old-engine-opening-port) finishes every line but "the old files no longer exist": src/core2 and src/bench import nothing from src/simulation, and ten drawn towns plus a played year in Rockingham, Georgia (seed 7c4b3250b2f08409) match main by record id. The lifted old files are still imported by about 800 other old-engine files, so they go with the folder in core-delete-old-engine, whose done-when already requires it; the CTO marks this item done when #6637 merges (`--by=cto`).
