---
id: people-port-traits-upbringing
title: "Traits, trait packs, personality and upbringing live in core"
area: people
kind: wiring
priority: 2
size: M
status: dropped
claimed-by:
pr: #5104
blocked-on:
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
---

**What.** Move `simulation/trait-registry`, `trait-packs`, `people-traits` (`notableQualityRoom`, `registeredTraitLean`, `upbringingQualities`), `people-upbringing` (`upbringingFor`, `upbringingCoreValueFrom`) and `personality-catalogue` into `src/core2`, with their data, and point `population.ts` and the people engines at the core copies. The old files go once nothing else imports them. The player notices nothing: the same town opens. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer. Research before building: the trait packs keep their sources. This is a game, not a spreadsheet: keep only what the opening and the people engines read.

**Done when.** In a drawn place (name and seed in the PR body) the opening's traits and upbringing equal before and after by person record id, population.ts imports none of the five old files, the tests for the moved files pass, and the PR counts the old files deleted.

**Files.** src/simulation/trait-registry.ts, src/simulation/trait-packs.ts, src/simulation/people-traits.ts, src/simulation/people-upbringing.ts, src/simulation/personality-catalogue.ts, src/core2/population.ts

**Notes.** Part of the opening town builder port (docs/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.

Oct 19 (claude/port-trait-packs): the two leaf files are moved. src/simulation/mind-catalog.ts and trait-packs.ts are now src/core2/mind-catalog.ts and trait-packs.ts (they import only types and the id helper), and the 75 files that import them point there; none is left in the old folder. population.ts no longer imports trait-packs from the old engine. Still to do: personality-catalogue (imports the old traits/effects), people-traits, people-upbringing and trait-registry, which import many old modules (see the Oct 19 note on PR #5101 for the list); they wait on core-port-world-scaffold or a rewrite on core records.
