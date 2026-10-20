---
id: world-port-work-schedules
title: "Work schedules live in core"
area: world
kind: wiring
priority: 2
size: M
status: done
claimed-by: claude/port-work-patterns
pr: #5084
blocked-on:
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
claimed-at: 2026-10-19T18:33:59.606Z
---

**What.** Move `simulation/living-world/work-schedules` (`WORK_PATTERNS`, `workSchedulesFor`) into `src/core2` so `opening-work.ts` builds schedules without the old world type. Pattern keys stay the same, so every worker keeps the schedule they had. The player notices nothing: the same town opens. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer. One rule, all 56 places: patterns are data.

**Done when.** In a drawn place (name and seed in the PR body) the opening's work schedules equal before and after by work record id, opening-work.ts imports nothing from the old engine, and its test passes.

**Files.** src/simulation/living-world/work-schedules.ts, src/core2/opening-work.ts

**Notes.** Part of the opening town builder port (docs/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.

Looked at 2026-10-16: bigger than S. `workSchedulesFor` is not a lookup: it builds an employer roster index from `world.history.workRelationships` (`jobIndex`, about lines 273 to 512 of the old file) and reads `life-queries`, `time-work`, `work-absence`, `vitality-integrity` and `town-employment`, so only the `WORK_PATTERNS` and `WORKPLACE_PATTERN` tables move cleanly (as data). Six old-engine files still import it (protests, law-interest-groups, campaign-canvass, campaign-helpers, campaign-life-activities, relationship-contact), so moving it also means porting or deleting those readers, or "replace, never layer" is broken by a copy. Do the tables as data first, then the roster rule on the opening's own job rows.

Oct 19 (claude/port-work-patterns): the tables half is done. WORK_PATTERNS and its types moved to src/core2/work-patterns.ts, and opening-work.ts reads them there. The roster rule is the new item world-port-work-schedules-roster.
