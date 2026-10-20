---
id: laws-reach-b-roads-parks
title: "The highways line changes commute time and vehicle costs; the parks line changes leisure time and well-being"
area: laws
kind: stopgap
priority: 3
size: M
status: claimed
claimed-by: claude/roads-condition
pr:
blocked-on: engines that do not exist: a road-condition setter read by commute time and vehicle costs (no commute model in core2), and a park service level read by leisure choices
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:13:38.724Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Oct 20 (claude/roads-condition): the highways half is built: `runBudgetLine` writes the town's poor-road share from the line's level with `setRoadCondition`, and place-prices moves each household's repair spending monthly (`highways-road-condition.test.ts`). The parks half (leisure time and well-being) is not: it needs a recreation need and act in the free-block plan with sourced time-use data.
