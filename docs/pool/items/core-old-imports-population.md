---
id: core-old-imports-population
title: "The opening population builder reads the core's character history, upbringing, traits and world types, not the old engine's"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/core2/population.ts` (1,644 lines) builds the opening's people with the old engine's character history (`simulation/character-history`), upbringing (`simulation/people-upbringing`), traits (`simulation/people-traits`, `trait-registry`, `trait-packs`), personality catalogue and world types. Move the pieces the opening actually uses into core modules (`src/core2/`), reading the same data, so that the people the town opens with have the same histories, upbringings and traits by record id. Anything the opening does not read is left behind, not carried over. This is the people half of the opening port; the world scaffold half is core-port-world-scaffold.

**Rules.** Replace, never layer: each old import is deleted when its core replacement lands. One model, two tiers: only full people get a history and traits; the counted population is filled in on meeting. Build only what the golden path needs.

**Done when.** In a drawn place from all 56 (name and seed in the PR body, `buildBenchWorld`) the imports of `population.ts` from `simulation/character-history`, `people-upbringing`, `people-traits`, `trait-registry`, `trait-packs` and `personality-catalogue` are gone, a fingerprint of each full person's traits, upbringing and history ids is equal before and after, and `src/core2/population.test.ts` passes; the PR counts old files removed.

**Files.** src/core2/population.ts, src/core2/people/, src/core2/data/

**Notes.** Written Oct 18 from the file's imports (it was a placeholder). Do after or beside core-port-world-scaffold; each keeps the town the same.
