---
id: core-port-world-scaffold
title: "The opening builder writes core records, not an old-engine world"
area: core
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: core-old-imports-opening-employment
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
claimed-at: 2026-10-19T18:35:36.559Z
---

**What.** `population.ts` builds an old-engine world (`simulation/world`: `createWorld`, `assertWorldIntegrity`, `writeWithWorldIntegrityOnce`, and the `simulation/types` household, membership, location, kinship and partner records) only so the people writer and the employment matcher have somewhere to write. Give the builder a core-form target for those records so the world scaffolding leaves `population.ts`. The other parts of this port (people, names, town employment, pay, schedules, residents) each return core records into the same target. The player notices nothing: the same town opens. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer: the old scaffolding is deleted in the same change. One model, two tiers: the opening fills full people only where they matter.

**Done when.** In a drawn place (name and seed in the PR body) population.ts imports nothing from simulation/world or simulation/types, the same town opens by record id (a fingerprint of people, households and memberships equal before and after), and src/core2/population.test.ts passes; the PR counts old files removed.

**Files.** src/core2/population.ts, src/core2/types.ts, docs/coordination/core.md

**Notes.** Part of the opening town builder port (docs/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.

Oct 20: Switched from blocked to the automatic after: gate on core-old-imports-opening-employment, so it opens by itself the moment those items are done.
