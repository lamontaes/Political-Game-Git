---
id: roadmap-m1-13-other-places-command
title: "Roadmap M1-13 has no command: a check that plays a year and reads how other places change"
area: world
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Roadmap M1-13, other places at a coarser level, reads passes: false with command null on main. Other places are the regional engine's regions and the counted-moves engine's states; their public events are the regional engine's monthly state jobs reports. A check on a played year in the runner's drawn place can read each clause of the spec and name the ones no engine or no sourced range covers yet.

**Rules.** Wire to the world: the check plays buildBenchWorld with every module in a place drawn from all 56. Research before building: a clause with no sourced range in the repo fails and says so; nothing is invented to pass it. Never edit a spec's test text.

**Done when.** docs/roadmap/features.json has a command for M1-13 that plays a year in the runner's drawn place, fails naming each clause no engine or source covers, was run on main with place and seed in the PR body, and fails when moves between states name no cause.

**Files.** src/bench/m1-13-check.ts, docs/roadmap/features.json

**Notes.** Split by the M0-M2 lead from roadmap-m1-places-history-flags (CTO branch).
