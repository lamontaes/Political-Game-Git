---
id: world-port-town-employment
title: "Town employment returns core job records"
area: world
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-76ksvw
pr: #5093
blocked-on:
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
claimed-at: 2026-10-20T05:12:20.127Z
---

**What.** `ensureTownEmployment`, `TOWN_WORKPLACES`, `townEmploymentMix`, `activeWorkers`, `laborStatus` and the tenure and part-time tables in `simulation/living-world/town-employment` (and `.generated`), with `organizationProfileAt` from `life-queries` and `jailTermOn` from `justice/jail-terms`, write jobs into an old-engine world. Port them so they return core organization and job records that `population.ts` and `opening-employment.ts` read directly. The player notices nothing: the same town opens. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer. Wire to the world: a job is read by the jobs engine. One rule, all 56 places: employment mixes are place data.

**Done when.** In a drawn place (name and seed in the PR body) a one-year played world (buildBenchWorld) shows the same jobs by organization record id before and after, the jobs engine reads each, population.ts and opening-employment.ts import none of these old files, and their tests pass.

**Files.** src/simulation/living-world/town-employment.ts, src/simulation/life-queries.ts, src/simulation/justice/jail-terms.ts, src/core2/opening-employment.ts, src/core2/population.ts

**Notes.** Part of the opening town builder port (docs/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.

Oct 19 (claude/port-town-workplaces): the workplace tables half is done. Role, Workplace, TOWN_WORKPLACES, the tenure and part-time tables and townWorkplaceFor moved unchanged to src/core2/town-workplaces.ts; opening-employment.ts and the four old readers import them there, and the old file keeps no copy. Still to port: townEmploymentMix and townWorkplaceWeights (the sourced county and state mix), laborStatus, townResidents, activeWorkers and ensureTownEmployment, which write jobs into the old world.

Oct 20 (cto): sent back PR #5100. EntityId in src/core2/town-employment-mix.ts imported from ../simulation/types (old engine) instead of ./types. Pool item status was also dropped on main when stacked PR #5093 was dropped, causing merge conflict.

