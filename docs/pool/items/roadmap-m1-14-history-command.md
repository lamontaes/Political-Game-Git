---
id: roadmap-m1-14-history-command
title: "Roadmap M1-14 has no command: a check that reads a new game's history before its start"
area: core
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/quirky-ride-vrwwz4-m1-14
pr: #5883
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T03:01:51.231Z
---

**What.** Roadmap M1-14, history before your start, reads passes: false with command null on main. The bench world runs every module's pre-start pass when it builds (src/core2/pre-start.ts), writing dated records for people, the economy, laws, budgets and how officials reached their seats. A check on a new game in the runner's drawn place can read each clause of the spec from those records and measure the load time and size.

**Rules.** Wire to the world: the check builds buildBenchWorld with every module in a place drawn from all 56 and reads its own pre-start records. Estimate, never UNKNOWN: the economy's months are compared with the published figures they came from. Never edit a spec's test text.

**Done when.** docs/roadmap/features.json has a command for M1-14 that, in the runner's drawn place, checks the start date, recent dated life events for the player's household, the economy's months against the published figures, dated law changes, and prior years' budgets, prints the load time and size, was run on main with place and seed in the PR body, and fails when a recorded economy figure differs from the published one.

**Files.** src/bench/m1-14-check.ts, docs/roadmap/features.json

**Notes.** Split by the M0-M2 lead from roadmap-m1-places-history-flags (CTO branch).
