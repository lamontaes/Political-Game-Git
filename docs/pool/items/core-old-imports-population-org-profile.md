---
id: core-old-imports-population-org-profile
title: "The opening reads an organization's current profile from the core's own history records, not the old life-queries module"
area: core
kind: cleanup
priority: 2
size: S
status: claimed
claimed-by: claude/old-imports-org-profile
pr: #5510
blocked-on:
source: split from core-old-imports-population
claimed-at: 2026-10-20T05:42:31.756Z
---

**What.** The opening asks the old life-queries module for each organization's latest profile record (organizationProfileAt). The opening population builder in src/core2/population.ts still builds a whole old-engine World first and reads these pieces from src/simulation. Move only what the opening uses into the core as data and small functions, and delete nothing the old engine still needs until core-delete-old-engine. Nothing new is added to the old engine.

**Rules.** Replace, never layer: the core copy is the only one the opening reads, and the PR body counts the lines it no longer imports. One rule, all 56 places: the move names no state, city or GEOID. Wire to the world: the opening's output for a drawn place stays identical before and after the move.

**Done when.** Each organization the opening builds takes its name, classification and location from a core-side read of the same history records, shown by organization record id in the PR body. In a drawn place and seed named in the PR body, buildBenchWorld produces the same opening records before and after, and src/core2/population.ts has no import from src/simulation for this piece; the opening tests in src/core2 for that place pass.

**Files.** src/core2/population.ts, src/simulation/life-queries.ts

**Notes.** Split Oct 19 from core-old-imports-population, which was sized M but touches five old-engine modules. The sibling slices are core-old-imports-population-org-profile, core-old-imports-population-traits and core-old-imports-population-town-employment.
