---
id: world-port-work-schedules-roster
title: "The opening's work schedules come from the opening's own job rows, not the old engine's employer roster"
area: world
kind: cleanup
priority: 2
size: M
status: in-pr
claimed-by: claude/work-schedules-roster
pr: #5097
blocked-on:
source: split from world-port-work-schedules
claimed-at: 2026-10-19T18:50:58.598Z
---

**What.** The opening still builds each worker's schedule by calling `workSchedulesFor` in the old engine, which indexes the employer's roster from the old world's work relationships and reads life-queries, time-work, work-absence and town-employment. The pattern tables are already in the core (src/core2/work-patterns.ts). Write the roster rule fresh on the opening's own job rows: staff who share a rotating pattern at one employer take turns, so a hospital or a diner is staffed through the week. Then delete `workSchedulesFor` once its six old-engine readers are ported or removed.

**Rules.** Replace, never layer: the old function is deleted when its last reader goes. One rule, all 56 places: patterns are data keyed by workplace kind, never by place. Wire to the world: a worker keeps the schedule they had.

**Done when.** In a drawn place (name and seed in the PR body) the opening's work schedules equal before and after by work record id in buildBenchWorld, src/core2/opening-work.ts imports nothing from src/simulation, and the work tests in src/core2 (work-attendance, work-data-native-import) pass.

**Files.** src/core2/opening-work.ts, src/core2/work-patterns.ts, src/simulation/living-world/work-schedules.ts

**Notes.** Split Oct 19 from world-port-work-schedules, whose pattern-table half is done.
