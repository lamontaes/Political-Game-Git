---
id: world-port-town-employment
title: "Town employment returns core job records"
area: world
kind: wiring
priority: 2
size: M
status: blocked
claimed-by:
pr: #5540
blocked-on: core: the opening still builds from the old World history tables, so a core port of town employment needs core records for those first (old-core-retirement-map); sent back on 5540 for importing them
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
claimed-at:
---

**What.** `ensureTownEmployment`, `TOWN_WORKPLACES`, `townEmploymentMix`, `activeWorkers`, `laborStatus` and the tenure and part-time tables in `simulation/living-world/town-employment` (and `.generated`), with `organizationProfileAt` from `life-queries` and `jailTermOn` from `justice/jail-terms`, write jobs into an old-engine world. Port them so they return core organization and job records that `population.ts` and `opening-employment.ts` read directly. The player notices nothing: the same town opens. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer. Wire to the world: a job is read by the jobs engine. One rule, all 56 places: employment mixes are place data.

**Done when.** In a drawn place (name and seed in the PR body) a one-year played world (buildBenchWorld) shows the same jobs by organization record id before and after, the jobs engine reads each, population.ts and opening-employment.ts import none of these old files, and their tests pass.

**Files.** src/simulation/living-world/town-employment.ts, src/simulation/life-queries.ts, src/simulation/justice/jail-terms.ts, src/core2/opening-employment.ts, src/core2/population.ts

**Notes.** Part of the opening town builder port (docs/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.

Oct 19 (claude/port-town-workplaces): the workplace tables half is done. Role, Workplace, TOWN_WORKPLACES, the tenure and part-time tables and townWorkplaceFor moved unchanged to src/core2/town-workplaces.ts; opening-employment.ts and the four old readers import them there, and the old file keeps no copy. Still to port: townEmploymentMix and townWorkplaceWeights (the sourced county and state mix), laborStatus, townResidents, activeWorkers and ensureTownEmployment, which write jobs into the old world.

Oct 20 (cto): sent back PR #5100. EntityId in src/core2/town-employment-mix.ts imported from ../simulation/types (old engine) instead of ./types. Pool item status was also dropped on main when stacked PR #5093 was dropped, causing merge conflict.


Sent back 2026-10-20 from PR #5540 (branch claude/port-town-employment): new src/core2/town-labor.ts imports old simulation runtime queries and types; port the required reads and types into Core before moving the module there; finish on that branch, merge main into it first.

Looked at Oct 20 (claude/political-game-pool-3xfqef-17), released unbuilt. The send-back on #5540 (branch claude/port-town-employment, commit bd62c320d2) says `src/core2/town-labor.ts` imports old runtime queries and types. Reading the file, the import list is the smaller problem: `laborStatus`, `townOrganizationsOf`, `townResidents` and `activeWorkers` all take the old engine's `World` and read `world.history` (workRelationships, workStatuses, educationEnrollments, householdMemberships, partnerships, personDeaths), `world.people`, `world.personOrder`, `organizationProfileAt` and the care and education queries. Porting the types and queries into core would only move the old `World` shape into core. The real port rewrites these four functions to read core records (`CoreState` people, households, jobs, organizations, and the education and care records the core holds), which depends on how `population.ts` supplies the opening's circumstances (the item `core-remaining-port-the-opening-town-builder-population` and `core-old-imports-population`). A builder starts from `core-old-imports-population` (the opening population builder reading core character history and traits) and ports `town-labor.ts` against the core's records once those exist; the 12-file branch is a useful move of the code but not the finished port.

Sent back 2026-10-20 from PR #5540 (branch claude/port-town-employment): the new src/core2/town-labor.ts imports life-queries and World types from src/simulation; core code must not import the old engine; finish on that branch, merge main into it first.
