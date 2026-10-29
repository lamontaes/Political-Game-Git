---
id: research-regional-population-change-range-states
title: "A sourced one-year population change range for the states and D.C., checked by M1-13"
area: core
kind: research
priority: 2
size: S
status: in-pr
claimed-by:
pr: #6023
blocked-on:
source: added with npm run pool -- add
---

**What.** Split from research-regional-population-change-range on the merger's send-back of PR #6023. The Census Bureau's state population estimates (intercensal 2000-2010, Vintage 2020, Vintage 2024) give a one-year change range for the 50 states and D.C.; the merger reproduced all 1,224 state-years and both percentiles. M1-13 checks each state and D.C. region against it and names the territory regions as unchecked, which stays open under the parent item until a territorial range is sourced.

**Rules.** Research before building: real data checks the simulation and never decides an outcome. A territory is never held to the state range; it is reported unchecked until its own range is sourced.

**Done when.** data/research/regional/series/stats.json carries stateOneYearPopulationChangePct with its citation and script, and src/bench/m1-13-check.ts checks every state and D.C. region against it in a place drawn from all 56, naming the territory regions as unchecked, with the result in the PR body.

**Files.** data/research/regional/population_change.py,data/research/regional/series/stats.json,src/bench/m1-13-check.ts

**Notes.** TODO

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built (merged #6023).
