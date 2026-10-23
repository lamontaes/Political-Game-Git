---
id: core-port-town-residents
title: "The household skeletons are written as core records"
area: core
kind: wiring
priority: 2
size: S
status: done
claimed-by:
pr: #4652
blocked-on:
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
claimed-at:
---

**What.** `townHouseholdPeople` in `simulation/living-world/town-residents` still names people and writes households into the old world. After the names and character-history ports, write them out as core records and delete the old town-residents. The player notices nothing: the same town opens. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer. One model, two tiers: counted households keep counts, full households keep people.

**Done when.** In a drawn place (name and seed in the PR body) the opening's households equal before and after by household record id, population.ts no longer imports town-residents, and the households test passes.

**Files.** src/simulation/living-world/town-residents.ts, src/core2/town-households.ts, src/core2/population.ts

**Notes.** Part of the opening town builder port (docs/archive/2026-10-23/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.

Sent back 2026-10-16 from PR #4652 (branch claude/core-port-town-residents): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
