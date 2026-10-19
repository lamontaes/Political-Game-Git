---
id: people-port-traits-upbringing
title: "Traits, trait packs, personality and upbringing live in core"
area: people
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
---

**What.** Move `simulation/trait-registry`, `trait-packs`, `people-traits` (`notableQualityRoom`, `registeredTraitLean`, `upbringingQualities`), `people-upbringing` (`upbringingFor`, `upbringingCoreValueFrom`) and `personality-catalogue` into `src/core2`, with their data, and point `population.ts` and the people engines at the core copies. The old files go once nothing else imports them. The player notices nothing: the same town opens. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer. Research before building: the trait packs keep their sources. This is a game, not a spreadsheet: keep only what the opening and the people engines read.

**Done when.** In a drawn place (name and seed in the PR body) the opening's traits and upbringing equal before and after by person record id, population.ts imports none of the five old files, the tests for the moved files pass, and the PR counts the old files deleted.

**Files.** src/simulation/trait-registry.ts, src/simulation/trait-packs.ts, src/simulation/people-traits.ts, src/simulation/people-upbringing.ts, src/simulation/personality-catalogue.ts, src/core2/population.ts

**Notes.** Part of the opening town builder port (docs/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.

Checked Oct 19 (claude), nothing built: this is not a move of five files. people-upbringing.ts (1,702 lines) imports the old life-queries, history-index, household-pay, living-world/town-pay, childhood-record, family-shape, vitality-integrity and types; people-traits.ts (661 lines) imports the old mind, queries, trait-readings and world; trait-registry.ts imports 15 old decision modules (justice, press, careers, mogul and others). Moving them into src/core2 would make the core import the old engine, which is worse than today. trait-packs (70 importers) and personality-catalogue are leaves and could move first. The upbringing and traits-reading code needs the opening to stop building an old World (core-port-world-scaffold) or a rewrite on core records. Split into: leaves (trait-packs, personality-catalogue), then upbringing on core records, then registry.
