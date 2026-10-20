---
id: core-old-imports-population
title: "The opening population builder reads the core, not the old engine"
area: core
kind: cleanup
priority: 2
size: L
status: in-pr
claimed-by: claude/old-imports-population
pr: #5068
blocked-on: "core-old-imports-population-org-profile, core-old-imports-population-traits, core-old-imports-population-town-employment"
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:01:40.192Z
---

**What.** The opening population builder in src/core2/population.ts builds a full old-engine World first and then reads people, traits and employment from it. It still imports five old-engine modules: life-queries, town-employment and its generated meta, personality-catalog, trait-registry and trait-packs. Found while claiming: this is L in practice, so it is split into three bounded items, each moving one piece into the core.

**Rules.** Replace, never layer: each piece's old import is deleted from population.ts in the same change as its core replacement. One rule, all 56 places: nothing names a place. Wire to the world: the opening's records for a drawn place stay the same through every slice.

**Done when.** The three sub-items are done and src/core2/population.ts imports nothing from src/simulation; buildBenchWorld in a drawn place and seed named in the PR body opens with the same records as before, and the opening tests pass.

**Files.** src/core2/population.ts

**Notes.** Split Oct 19. Sub-items: core-old-imports-population-org-profile (S), core-old-imports-population-traits (M), core-old-imports-population-town-employment (M, do with core-old-imports-opening-employment). The deeper cause is that the opening builds an old World first; ending that is core-delete-old-engine's last step.
