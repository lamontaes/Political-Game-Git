---
id: core-old-imports-population-traits
title: "The opening reads the trait registry, personality pack and one-sided test from the core, not the old trait engine"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from core-old-imports-population
---

**What.** The opening seeds each person's traits through the old trait registry (traitRegistryFor), the PERSONALITY_PACK name and the isOneSided test, which pull in the compiled trait packs and every decision declaration. The opening population builder in src/core2/population.ts still builds a whole old-engine World first and reads these pieces from src/simulation. Move only what the opening uses into the core as data and small functions, and delete nothing the old engine still needs until core-delete-old-engine. Nothing new is added to the old engine.

**Rules.** Replace, never layer: the core copy is the only one the opening reads, and the PR body counts the lines it no longer imports. One rule, all 56 places: the move names no state, city or GEOID. Wire to the world: the opening's output for a drawn place stays identical before and after the move.

**Done when.** Every seeded trait value for a drawn place's people matches the old registry's value by person record id and trait key, and the core reads data/content/trait-act-pulls.json or a core trait table rather than src/simulation/trait-registry.ts. In a drawn place and seed named in the PR body, buildBenchWorld produces the same opening records before and after, and src/core2/population.ts has no import from src/simulation for this piece; the opening tests in src/core2 for that place pass.

**Files.** src/core2/population.ts, src/core2/opening-personality.ts, src/simulation/trait-registry.ts, src/simulation/trait-packs.ts, src/simulation/personality-catalogue.ts

**Notes.** Split Oct 19 from core-old-imports-population, which was sized M but touches five old-engine modules. The sibling slices are core-old-imports-population-org-profile, core-old-imports-population-traits and core-old-imports-population-town-employment.
