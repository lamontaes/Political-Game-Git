---
id: world-port-work-schedules
title: "Work schedules live in core"
area: world
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
claimed-at:
---

**What.** Move `simulation/living-world/work-schedules` (`WORK_PATTERNS`, `workSchedulesFor`) into `src/core2` so `opening-work.ts` builds schedules without the old world type. Pattern keys stay the same, so every worker keeps the schedule they had. The player notices nothing: the same town opens. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer. One rule, all 56 places: patterns are data.

**Done when.** In a drawn place (name and seed in the PR body) the opening's work schedules equal before and after by work record id, opening-work.ts imports nothing from the old engine, and its test passes.

**Files.** src/simulation/living-world/work-schedules.ts, src/core2/opening-work.ts

**Notes.** Part of the opening town builder port (docs/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.
