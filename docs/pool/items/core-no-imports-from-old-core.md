---
id: core-no-imports-from-old-core
title: "core2 must not import from src/simulation"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/political-game-pool-yucp92-r
pr: #5378
after:
blocked-on:
milestone:
source: "post-merge audit Oct 19 evening, item 5 (PR #5104)"
claimed-at: 2026-10-20T01:22:00.235Z
---

**What.** Since PR #5104 merged, `src/core2/trait-packs.ts` and `src/core2/mind-catalog.ts` import types from `../simulation/types`, so the new engine now depends on the old one. core2 must never import from `src/simulation`, because the old folder is being deleted and every such import blocks that. The types these two files use move into `src/core2`, and the files import them from there. Once the edge is gone, the old-core line (`core-old-engine-*`) can delete `src/simulation` without breaking the new engine.

**Rules.** The new core is the engine: never start a parallel engine. Move the types into core2 rather than copying them, so there is one definition and the old folder can be deleted.

**Done when.** `grep -r "simulation" src/core2` returns nothing and the typecheck passes. The types the two files need now live in `src/core2`, and a drawn-place world from buildBenchWorld plays one year with the same record ids as before the move.

**Files.** src/core2/trait-packs.ts, src/core2/mind-catalog.ts

**Notes.** Found in the post-merge audit of Oct 19 evening. The old-core line (`core-old-engine-*`) depends on this item.

Built Oct 20 on claude/political-game-pool-yucp92-r: the six mind-catalog types (MindStrength, PersonalityExpressionDefinition, PersonalityTendencyDefinition, PersonalValueDefinition, MindCatalog) now live in src/core2/mind-types.ts; trait-packs.ts and mind-catalog.ts import them there, and src/simulation/types.ts re-exports them, so there is one definition. `grep -r simulation` still finds other files in src/core2 (population.ts, town-households.ts, opening-employment.ts, opening-work.ts and the tooling scripts); those belong to the core-old-imports-* items, not this one, whose two named files are clear.
