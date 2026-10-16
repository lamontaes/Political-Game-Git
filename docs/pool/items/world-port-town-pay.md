---
id: world-port-town-pay
title: "Town pay lives in core"
area: world
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: claude/world-port-town-pay
pr:
blocked-on:
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
claimed-at: 2026-10-16T07:44:26.014Z
---

**What.** Move `simulation/living-world/town-pay` (`nationalMedianAnnualWage`, `townJobRate`, `townPayPercentile`, `weeklyHoursOf`) and its generated metadata into `src/core2`, so pay for the opening's jobs is set without the old world. The player notices nothing: the same town opens. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer. Estimate, never UNKNOWN: pay starts from the real wage with a per-world spread and its source. One rule, all 56 places.

**Done when.** In a drawn place (name and seed in the PR body) the opening's pay records are equal before and after by job record id, and the old town-pay files are deleted with no importer left; the town-pay test and src/core2/opening-employment tests pass.

**Files.** src/simulation/living-world/town-pay.ts, src/core2/opening-employment.ts, src/core2/population.ts

**Notes.** Part of the opening town builder port (docs/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.
