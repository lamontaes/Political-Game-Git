---
id: core-old-engine-02-gov-rules-duplicates
title: "The game imports the core2 copies of the 18 duplicated gov-rules files; the old originals are deleted"
area: core
kind: cleanup
priority: 1
size: S
status: open
claimed-by:
pr:
after: core-old-engine-01-zero-dice-guard-repoint
blocked-on:
source: "docs/reports/repo-audit-2026-10-19.md section A and G2 step 1"
---

**What.** This item records the October19 audit snapshot at `0104686`; its paths and counts require a current check before implementation. The audit found 18 files that exist in both engines: `names-data.ts` (1,685 lines in core2 against 1,728 in the old core), `given-name-cohorts.ts`, `person-identity.ts`, `county-governing-body-rules.ts`, `municipal-ballot-rules.ts` and the rest of `src/core2/gov-rules/`. The copies were made but the old originals were never deleted: layered, not replaced. Two live files still import the old copies: `src/core2/town-households.ts` takes `birthCohortGivenName`, `DEFAULT_CORPUS_VERSION`, `drawCanonicalNamedIdentity`, `generatePersonIdentity` and `nameCorpusVersionForWorld` from the old core, and `src/bench/creator.ts` takes `names-data`. Point both at `src/core2/gov-rules/*`, then delete each old original whose remaining importers are themselves old-core files (the rest go in step 7 with the folder). Draft #5031 carries part of this; finish on that branch.

**Rules.** Replace, never layer: each of the 18 old copies is deleted in the same PR that switches its last live importer, and the PR body lists the 18 paths. The new core is the engine: the game reads names and identity from `src/core2/gov-rules`, never from `src/simulation`. One rule, all 56 places: the county and municipal rule files keep their per-state data in core2. Recheck the present import graph and existing pool claims before removing or moving any path; preserve current consumers, guards and provenance.

**Done when.** `grep -rn "simulation/" src/core2/town-households.ts src/bench/creator.ts` returns nothing; `src/core2/gov-rules.test.ts` and `gov-rules/given-name-cohorts.test.ts` (old-versus-new parity checks) are deleted; the same drawn place built by `buildBenchWorld` gives the same people by record id and name before and after; the golden-path suite passes.

**Files.** src/core2/town-households.ts, src/bench/creator.ts, src/core2/gov-rules/, src/simulation/names-data.ts, src/simulation/given-name-cohorts.ts, src/simulation/person-identity.ts, src/simulation/county-governing-body-rules.ts, src/simulation/municipal-ballot-rules.ts

**Notes.** Audit section A: "Names and identity: already copied to src/core2/gov-rules; only the imports in town-households.ts and src/bench/creator.ts still point at the old copies (#5031)." The pool items `people-port-names` and `core-old-imports-14` were marked done without removing these imports. Parent: core-delete-old-engine.
