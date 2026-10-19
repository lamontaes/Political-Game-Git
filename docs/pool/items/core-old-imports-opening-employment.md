---
id: core-old-imports-opening-employment
title: "The opening's employment allocation comes from the core, not the old town-employment, life-queries and jail-terms code"
area: core
kind: cleanup
priority: 2
size: L
status: claimed
claimed-by: claude/old-imports-opening-employment
pr:
blocked-on: "core-old-imports-opening-employment-jail-term, core-old-imports-population-org-profile, core-old-imports-population-town-employment"
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:11:11.377Z
---

**What.** The opening's employment allocation (src/core2/opening-employment.ts) still imports three old-engine modules: jail-terms (`jailTermOn`), life-queries (`organizationProfileAt`) and town-employment with its generated meta (residents, labor status, workplaces, pay mix). Found while claiming: this is L in practice, and two of the three pieces are already split under core-old-imports-population, which reads the same functions. So this item is done when those two slices and one new jail-term slice are.

**Rules.** Replace, never layer: each old import is deleted from opening-employment.ts in the same change as its core replacement. One rule, all 56 places: nothing names a place. Wire to the world: the allocation for a drawn place stays identical before and after each slice.

**Done when.** The three sub-items are done and src/core2/opening-employment.ts imports nothing from src/simulation; buildBenchWorld in a drawn place and seed named in the PR body opens with the same employment records as before, and the opening employment tests in src/core2 pass.

**Files.** src/core2/opening-employment.ts

**Notes.** Split Oct 19. Sub-items: core-old-imports-opening-employment-jail-term (S, new), and from the sibling split core-old-imports-population-org-profile (S) and core-old-imports-population-town-employment (M); the town-employment and org-profile moves serve both population.ts and opening-employment.ts, so whoever builds them deletes both imports. The deeper cause is that the opening builds an old World first; ending that is core-delete-old-engine's last step.
