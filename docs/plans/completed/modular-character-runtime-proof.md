# Modular Character Runtime Proof

## Status

Completed — implemented and validated on the stacked
`claude/modular-character-runtime-proof` branch (base:
`claude/modular-character-foundation`, PR #46) for independent PR review.
Human visual and play review remains required on the open unmerged PR.

## Baseline and scope

- Started from PR #46 head `265c8f7a29d2d80f5116d79a853c418786e7a87d` in an
  isolated worktree.
- Recorded D-054: the catalog-generation pin lives on the person-owned
  `PersonAppearance`, set at creation and never written by presentation.
- Added `PersonAppearance.catalogGeneration`, creation plumbing
  (`LightweightPersonInput.appearanceCatalogGeneration`,
  `CreateScenarioWorldOptions.appearanceCatalogGeneration`), and world
  integrity validation. No snapshot format change.
- Added `src/presentation/character-render-plan.ts`: pure plan from appearance
  plus scene-owned `ModularSceneAnchor` to ordered, positioned, runtime-eligible
  layers with root and attachment markers.
- Added `src/player/ModularCharacter.tsx` (DOM layer compositor with
  developer-only anchor overlays) and `src/player/useSceneTransform.ts` (the
  office camera contract, parameterized).
- Added `src/presentation/character-proof.ts` and
  `src/ui/CharacterProofView.tsx` at `?view=character-proof`: four generated
  people on one stage, the first again seated, recipe cards, a component reuse
  table, and save/restore through the snapshot codec in browser storage.
- Added sixteen DEV / NON-PRODUCTION procedural components drawn by
  `scripts/art-asset-factory/dev-character-fixtures.ts`
  (`npm run fixtures:dev-characters`), released through the ordinary gate
  with provenance and hashes, and catalog generation 1.
- Refreshed the art inventory (24 items) and QA report; both are deterministic.

## Proof recipes (seed `modular-character-proof-2026-09-01-4`)

| Stage | Head      | Hair     | Top             | Eyewear           | Accessory     |
| ----- | --------- | -------- | --------------- | ----------------- | ------------- |
| 1     | dev-round | dev-crop | dev-tee-teal    | —                 | dev-lapel-pin |
| 2     | dev-round | dev-crop | dev-tee-teal    | dev-round-glasses | dev-lapel-pin |
| 3     | dev-oval  | dev-long | dev-blazer-navy | —                 | —             |
| 4     | dev-oval  | dev-crop | dev-tee-teal    | —                 | —             |

All four share `dev-adult` body, `dev-slacks-charcoal`, and `dev-oxford-black`.

## Verification

- Full Vitest: 39 files and 654 tests passed (including 16 render-plan,
  4 appearance-pin, and 6 validator/fixture tests).
- `npm run validate` (format, lint, typecheck, tests, build, deterministic
  demo, art validation) passed.
- `npm run inventory:art` (24 items) and `npm run qa:art` (transparency
  confirmed on all 16 fixtures) passed.
- Playwright: 58 browser tests passed (53 existing + 5 character-proof).
- `git diff --check` passed.

## Exclusions preserved

No production component art, external master import, generated art,
population-wide appearance generation, head-angle generation, animation,
rendering engine, office-scene consumption of modular recipes, Slice F,
campaign/election change, or corpus PR change. PRs #42–#46 untouched.
