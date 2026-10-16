---
id: core-port-town-residents
title: "The household skeletons are written as core records"
area: core
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: claude/core-port-town-residents
pr:
blocked-on:
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
claimed-at: 2026-10-16T08:17:23.617Z
---

**What.** `townHouseholdPeople` in `simulation/living-world/town-residents` still names people and writes households into the old world. After the names and character-history ports, write them out as core records and delete the old town-residents. The player notices nothing: the same town opens. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer. One model, two tiers: counted households keep counts, full households keep people.

**Done when.** In a drawn place (name and seed in the PR body) the opening's households equal before and after by household record id, population.ts no longer imports town-residents, and the households test passes.

**Files.** src/simulation/living-world/town-residents.ts, src/core2/town-households.ts, src/core2/population.ts

**Notes.** Part of the opening town builder port (docs/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.
