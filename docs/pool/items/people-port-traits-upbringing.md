---
id: people-port-traits-upbringing
title: "Traits, upbringing and trait-registry moved to core2"
area: people
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/port-traits
pr: #5101
blocked-on:
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
claimed-at: 2026-10-20T03:55:25.661Z
---

**What.** `people-traits.ts`, `people-upbringing.ts`, `trait-packs.ts`, `personality-catalogue.ts` and `trait-registry.ts` in `src/simulation` define traits, upbringing experiences and the registry of traits. Move them into `src/core2` so they live with the other person engines. No game logic changes. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer. Wire to the world: a trait pack is read by the director and decision engines. One rule, all 56 places: trait profiles and upbringing are place-independent.

**Done when.** In a drawn place (name and seed in the PR body) a one-year played world (`buildBenchWorld`) shows identical person traits and upbringing records before and after, `src/core2` imports none of these files from the old engine, and the traits tests pass in `src/core2`.

**Files.** src/simulation/people-traits.ts, src/simulation/people-upbringing.ts, src/simulation/trait-packs.ts, src/simulation/personality-catalogue.ts, src/simulation/trait-registry.ts

**Notes.** Part of the opening town builder port (docs/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.

Checked Oct 19 (claude), nothing built: this is not a move of five files. people-upbringing.ts (1,702 lines) imports the old life-queries, history-index, household-pay, living-world/town-pay, childhood-record, family-shape, vitality-integrity and types; people-traits.ts (661 lines) imports the old mind, queries, trait-readings and world; trait-registry.ts imports 15 old decision modules (justice, press, careers, mogul and others). Moving them into src/core2 would make the core import the old engine, which is worse than today. trait-packs (70 importers) and personality-catalogue are leaves and could move first. The upbringing and traits-reading code needs the opening to stop building an old World (core-port-world-scaffold) or a rewrite on core records. Split into: leaves (trait-packs, personality-catalogue), then upbringing on core records, then registry.

Oct 19 (claude/port-trait-packs): the two leaf files are moved. src/simulation/mind-catalog.ts and trait-packs.ts are now src/core2/mind-catalog.ts and trait-packs.ts (they import only types and the id helper), and the 75 files that import them point there; none is left in the old folder. population.ts no longer imports trait-packs from the old engine. Still to do: personality-catalogue (imports the old traits/effects), people-traits, people-upbringing and trait-registry, which import many old modules; they wait on core-port-world-scaffold or a rewrite on core records.

Oct 19 (claude/port-trait-effects): the personality catalogue is moved too. personality-catalogue.ts, its generated table and the 42 trait effect readers (src/simulation/traits/effects) are now under src/core2 (trait-effects/), importing only trait-packs and each other; the generators and their tests point there. Still to do: people-traits, people-upbringing and trait-registry, which import many old modules.

Checked Oct 20 (claude), released, not moved: (1) trait-packs.ts does not exist in src/simulation (the compiled one is compiled-trait-packs.ts, with its generator in scripts/traits). (2) The four that exist are imported by 40 (people-traits), 21 (trait-registry), 7 (personality-catalogue) and 4 (people-upbringing) other files, almost all old-core files, so a move either re-points all of them (a 70-file change in the engine being retired) or leaves a re-export (layering, which the replace-never-layer rule forbids). (3) They import the old core themselves (mind, world, trait-readings, childhood-record, town-pay, state-jurisdiction-id), so the moved files would still import src/simulation, the opposite of the done-when line. The port has to start from what core2 reads: src/core2/population.ts reads people-upbringing and personality-catalogue; write fresh the part core2 needs and let the rest die with the old core. A builder should name that part first.
