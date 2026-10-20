---
id: core-old-imports-population-town-employment
title: "The opening reads town employment from core data, not the old living-world town-employment module"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from core-old-imports-population
claimed-at:
---

**What.** The opening calls ensureTownEmployment and reads TOWN_EMPLOYMENT_META from the old living-world module for county business patterns and public employment. This overlaps core-old-imports-opening-employment, which reads the same module, so do both in one change. The opening population builder in src/core2/population.ts still builds a whole old-engine World first and reads these pieces from src/simulation. Move only what the opening uses into the core as data and small functions, and delete nothing the old engine still needs until core-delete-old-engine. Nothing new is added to the old engine.

**Rules.** Replace, never layer: the core copy is the only one the opening reads, and the PR body counts the lines it no longer imports. One rule, all 56 places: the move names no state, city or GEOID. Wire to the world: the opening's output for a drawn place stays identical before and after the move.

**Done when.** A drawn place's opening employers and jobs match the old module's by employer record id, and src/core2/population.ts and src/core2/opening-employment.ts both read the core copy. In a drawn place and seed named in the PR body, buildBenchWorld produces the same opening records before and after, and src/core2/population.ts has no import from src/simulation for this piece; the opening tests in src/core2 for that place pass.

**Files.** src/core2/population.ts, src/core2/opening-employment.ts, src/simulation/living-world/town-employment.ts

**Notes.** Split Oct 19 from core-old-imports-population, which was sized M but touches five old-engine modules. The sibling slices are core-old-imports-population-org-profile, core-old-imports-population-traits and core-old-imports-population-town-employment.

Looked at Oct 20 (claude/old-imports-note) and handed back unbuilt: `ensureTownEmployment` is 1,198 lines in `src/simulation/living-world/town-employment.ts` that mutate an old-engine `World` (`createOrganization`, `createWorkRelationships`, `organizationProfileAt`, `activeWorkRelationshipsAt`, local-government units), and `population.ts` then converts that World into the core's input. Moving only what the opening uses means writing a pure generator from the town's County Business Patterns and public employment to core organization and job inputs, and changing the conversion to take them, with the opening records identical by employer id. That is an L item, not M: split it into (1) the pure employer generator with a test that matches the old module's employers for a drawn place, (2) switching `population.ts` and `opening-employment.ts` to it, (3) deleting the old reads. Do the first part first.
