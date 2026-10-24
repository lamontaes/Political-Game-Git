---
id: roadmap-m2-10-races-command
title: "Roadmap M2-10 has no command: a check that plays a midterm and a presidential November in the played world"
area: gov
kind: feature
priority: 2
size: S
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-m2-10
pr: #5880
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T05:10:38.373Z
---

**What.** Roadmap M2-10, state and federal races in the world, reads passes: false with command null on main. src/core2/world-races.test.ts covers its clauses in a hand-built world of 120 people with chosen modules and ignores the runner's drawn place, which cannot prove play. A check on the bench world, opened three weeks before November 2026 and November 2028 in the runner's place, reads every race the world runs and who serves after the real seating dates.

**Rules.** Wire to the world: the check plays buildBenchWorld with every module installed in a place drawn from all 56. One rule, all 56 places: the races are every state's, read from data, never a named state. Never edit a spec's test text.

**Done when.** docs/roadmap/features.json has a command for M2-10 that runs both Novembers in the runner's drawn place, fails naming each race kind not run or winner not seated on its real date, was run on main with place and seed in the PR body, and fails when winners are not seated.

**Files.** src/bench/m2-10-check.ts, docs/roadmap/features.json

**Notes.** Split by the M0-M2 lead from roadmap-m2-filing-races-flags (CTO branch).
