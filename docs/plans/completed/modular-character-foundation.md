# Modular Character Foundation

## Status

Completed — implemented and validated on the bounded
`claude/modular-character-foundation` branch for independent PR review. Human
review remains required on the open unmerged PR.

## Baseline and scope

- Started from accepted `origin/main` at
  `d5c488a89c33ab425a276eec2112f78083ba6d7e` in an isolated clone.
- Recorded D-053: modular deterministic character composition is the current
  direction; the "asset-substitution pass" wording never authorized permanently
  flattened one-image-per-person characters.
- Extended the one existing art manifest with a `character-component` asset
  type and a `component` definition (kind, family, catalog generation, layer,
  canvas, rig root and attachment anchors for bodies, `attaches_to`/`origin`
  and minimum compatibility for every other kind, optional hair pairing).
- Added `art/manifest/character_catalog.json`: recipe slots with required or
  deterministic presence rates, and an append-only generation ledger whose
  signatures freeze each generation's membership and definitions.
- Added `src/presentation/character-components.ts`: React/DOM/Vite/Node-free
  contract, structural validator, identity/context resolver on the repository
  `SeededRng` keyed forks, established-recipe reproduction, and layer
  projection against explicit attachment anchors.
- Replaced the empty `attachmentSlots` tuple with the typed anchor contract
  and declared the modular wardrobe mode; existing A01/B01 authored-outfit
  recipes are unchanged.
- Extended `validate:art` to run the component contract and check each
  declared canvas against its real raster.
- Added a fixture component library (24 draft definitions, no rasters) and an
  empty production bootstrap catalog.

## Research inputs

The audit brief's constraints were followed as research input, not
specification. No canvas size, padding, layer count, affine threshold, colour
tolerance, recoloring, atlas, or off-screen rendering assumption was encoded.
PR #7's family-versus-asset identity split was reused conceptually; its
independent FNV/modulo selection was rejected in favour of `SeededRng` forks
and generation pinning.

## Verification

- Focused contract suite: 23 tests passed.
- Focused validator suite: 5 tests passed.
- Existing visual-integration and art-factory suites: unchanged, passed.
- Full Vitest suite: 37 files and 636 tests passed.
- `npm run validate` (format, lint, typecheck, tests, build, deterministic
  demo, art validation) passed.
- `npm run inventory:art` (8 items, up to date) and `npm run qa:art` passed
  with no report diff.
- Playwright: 53 browser tests passed.
- `git diff --check` passed.

## Exclusions preserved

No component art, generator, wardrobe library, normalization, head-angle
generation, animation, rendering engine, replacement of the accepted office
characters, scene-compositor consumption of modular recipes, Slice F,
campaign/election change, or corpus PR change. Canonical `Person`/`World`
semantics are unchanged. Persisting a session's pinned catalog generation per
person is the next bounded step.
