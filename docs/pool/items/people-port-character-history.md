---
id: people-port-character-history
title: "The people writer returns core records"
area: people
kind: wiring
priority: 2
size: M
status: dropped
claimed-by: claude/political-game-pool-6qjq1s
pr: #5185
blocked-on:
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
claimed-at: 2026-10-19T21:55:00.778Z
---

**What.** `createCharacterHistoryContextPeople` and `characterHistoryContextPersonId` in `simulation/character-history` write each opening person's name, traits and past into an old-engine world. Port them so they return core person records that `population.ts` reads directly. The traits and names sub-parts (people-port-traits-upbringing, people-port-names) are what they call. The player notices nothing: the same town opens. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer. One rule, all 56 places: place facts in data. No dice: traits come from the person's upbringing and the place, not a roll at the point of use.

**Done when.** In a drawn place (name and seed in the PR body) an opening built with the ported writer gives the same people (a fingerprint of names, traits and pasts equal before and after, by person record id), population.ts no longer imports simulation/character-history, and src/core2/population.test.ts passes.

**Files.** src/simulation/character-history.ts, src/core2/population.ts

**Notes.** Part of the opening town builder port (docs/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.
