---
id: core-old-imports-population
title: "The opening population builder reads the core's character history, upbringing, traits and world types, not the old engine's"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/core2/population.ts` imports the old engine's character history, upbringing, trait registry and packs, personality catalogue, `life-queries`, `town-employment` and the `World` and type files. Move what the opening's people builder uses into the core, write it fresh where that is simpler, and delete the rest. This is the last part and the largest.

**Rules.** Replace, never layer: the old import is deleted when its replacement lands. Build only what the golden path needs. Same town by record id for a drawn place before and after. One rule, all 56 places: no place is named in code.

**Done when.** The grep for imports of the old engine in `src/core2/population.ts` prints nothing, the typecheck passes, and a drawn-place opening in buildBenchWorld builds the same town by record id before and after.

**Files.** src/core2/population.ts, src/simulation/character-history.ts, src/simulation/people-upbringing.ts, src/simulation/people-traits.ts, src/simulation/trait-registry.ts

**Notes.** Split Oct 17 from core-old-imports-opening-builders. The largest of the five parts; take it last, after core-old-imports-opening-employment.
