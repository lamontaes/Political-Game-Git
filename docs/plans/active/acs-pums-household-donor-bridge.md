# ACS PUMS coherent household donor bridge

Status: ACTIVE

## Starting gate

- Authoritative implementation prompt: Section C of `01_CURRENT_IMPLEMENTATION_PROMPTS — 2026-09-05` (Drive ID `1mnN8JXMsenaDMOXBr59FIqJlYGW5fpSlK1kOsNGm8Qo`).
- Research authority: `90_FIRST_SESSION_LIFE_AND_ADAPTIVE_CHALLENGE_RESEARCH` (Drive ID `1NtEgKq4l7N7PWeu8EsxIUcqlYOooDeyVT14aODUd5i0`).
- Exact base and remote `main`: `8733190609c5620c40ed424686d43fb72fb78d0c`.
- Isolated branch/worktree: `codex/acs-pums-household-donor-bridge` in `/Users/lamontae/Documents/Political-Game-ACS-PUMS-Donor-Bridge`.
- The original detached workspace is read-only for this task; its two pre-existing image changes are not touched.

## Plan

- [x] Add an explicit 2024 ACS 1-year state-shard acquisition capability with independent housing, person, and dictionary artifacts, cache-only raw bytes, stable state/year identity, and a truthful unacquired-production gate.
- [x] Generalize the existing dictionary-driven compiler to join a declared state shard by `SERIALNO`, preserve corpus/record provenance and both weights, and keep the accepted 2023 Wyoming QA corpus and labels intact.
- [x] Compile a typed donor projection for only the supported household/person facts required by a legitimate initialization consumer, including allocation and unresolved-state distinctions and an explicit source-sex/canonical-identity boundary.
- [x] Add deterministic whole-household selection keyed by world seed, state, corpus/version, and constraints. Use only positive household weights; never assemble independent demographic marginals.
- [x] Add the first named one-way source adapter. It reuses `CharacterHistoryPlan` and applicable existing household/kinship/partnership/dwelling primitives, retains education/work facts when their required institutions or terms are absent, and adds no simulation truth store or player-facing prose.
- [x] Add deterministic fixtures and tests for linkage, state/year filtering, replay/variation, weights/provenance, dictionary-controlled mappings, NIU/missing/allocation handling, coherent relationships, identity isolation, no ideology/personality inference, no unrelated history mutation, and save/reload.
- [x] Update architecture, source-substrate, dependencies, acceptance, decision, and integrity-audit documentation for the accepted adapter boundary without widening Stage 6 or beginning Stage 7.
- [ ] Run focused tests, source validation/replay, full `npm run validate`, all three required art commands, `git diff --check`, and final agent preflight. Record the exact results, move this plan to completed, publish the new branch, open the requested draft PR, verify remote head/PR state, and leave it unmerged.

## Scope boundaries

- No new empirical records, national relabeling, source-byte acquisition claim, or runtime raw archive.
- No personality, ideology, morality, motive, feeling, named employer/school, exact-city representativeness, exact liquid resources, or future-career inference.
- PUMS source sex remains evidence in the donor projection and never writes canonical identity.
- No second household, relationship, education, employment, life-event, or persistence engine.
- No player-facing prose, UI, Stage 6 semantic redesign, or Stage 7 feature.

## Validation before publication

- Focused donor/capability proof: 28 tests passed.
- Full `npm run validate`: 119 files and 1,878 tests passed; formatting,
  lint, typecheck, source validation, byte-identical source replay, production
  build, deterministic demo, and art validation all passed.
- Source validation retained the pre-existing BLS incomplete-component and FEC
  cross-cycle linkage warnings; both remain explicit rather than defaulted.
- `npm run inventory:art`: 176 items, inventory already current.
- `npm run qa:art`: contact sheet and QA report regenerated with no git diff.
- `git diff --check`: passed.
- Final pre-publication preflight confirmed the isolated branch at exact base
  `8733190609c5620c40ed424686d43fb72fb78d0c`, with no upstream before the
  requested branch is published. Remote `main` still resolves to that exact
  base; the requested remote branch does not yet exist.
