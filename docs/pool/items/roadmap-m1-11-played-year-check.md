---
id: roadmap-m1-11-played-year-check
title: "M1-11's command checks drives from a played year's job losses, evictions and closures"
area: people
kind: feature
priority: 2
size: S
status: in-pr
claimed-by: claude/quirky-ride-vrwwz4-m1-11-check
pr: #5959
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T17:20:51.204Z
---

**What.** M1-11 reads 'Over a year, job losses, evictions and closures form drives at a researched rate, and a drive's target is a real person or institution involved in the event.' Its command, src/core2/drives-economy.test.ts, injects a fixture closure of every employer and fixture layoffs and evictions on one day in a drives-only world, the same proof the mergers rejected for M1-10. This item adds a check that plays a year of the world the player gets with the ordinary producers and holds the engine's own responses to those events to the spec.

**Rules.** Ask why: every response and every aimed drive is named by record id. Real rates check the town's totals, never one person's outcome. A slow check is a script under src/bench/, not a unit test; never edit drives-economy.test.ts. A kind of event that never happened leaves its clause unchecked, so the check fails naming it.

**Done when.** M1-11's command runs a script after drives-economy.test.ts that plays a year of buildBenchWorld in the runner's drawn place and checks each kind (job loss, eviction, closure) was answered, the displaced-worker ambition and carry-on shares against the researched band, that everyone answering was named by the event or shares its household or family, and that every aimed drive targets the party the event names, a record; it passes in a drawn place named with seed and fails when the ambition weight is raised out of band.

**Files.** src/bench/m1-11-check.ts, docs/roadmap/features.json

**Notes.** TODO
