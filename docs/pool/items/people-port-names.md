---
id: people-port-names
title: "Given names by birth year and the place-name corpus live in core"
area: people
kind: wiring
priority: 2
size: S
status: done
claimed-by: claude/people-port-names
pr: #4638
blocked-on:
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
claimed-at: 2026-10-16T07:32:08.886Z
---

**What.** Move `simulation/given-name-cohorts` (`birthCohortGivenName`) and `simulation/place-name-corpus` (`nameCorpusVersionForWorld`) into `src/core2`, so names are drawn without the old world. Names stay keyed by place and birth year, so the same people get the same names. The player notices nothing: the same town opens. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer. One rule, all 56 places: name tables are data keyed by place.

**Done when.** In a drawn place (name and seed in the PR body) the opening's given names equal before and after by person record id, population.ts imports neither old file, and the names test passes.

**Files.** src/simulation/given-name-cohorts.ts, src/simulation/place-name-corpus.ts, src/core2/population.ts

**Notes.** Part of the opening town builder port (docs/archive/2026-10-23/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.
