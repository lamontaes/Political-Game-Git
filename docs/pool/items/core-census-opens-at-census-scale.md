---
id: core-census-opens-at-census-scale
title: "A town above 10,000 opens at its Census count, its firms sized to it, no more than 20 percent slower than base"
area: core
kind: feature
priority: 1
size: S
status: in-pr
claimed-by:
pr: #5295
blocked-on:
source: added with npm run pool -- add
---

**What.** The part of core-census-uncap-opening that PR 5295 finishes. A town above 10,000 people opens with its generated 10,000-person sample and each counted household weighted so the town holds its Census count, by default rather than only when a count scale is asked for. Each firm's yearly demand, capacity, payroll, costs, supplier contracts and cash are sized to the same scale before the outside market is derived from its books, replacing the separate outside-sales and business-cash multipliers. The year in the largest towns may take no more than 20 percent longer than the same town opened at its sample on main.

**Rules.** One model, two tiers: every reader multiplies a counted household by its weight, so the counted town is the Census town and its money follows. Replace, never layer: the firm sizing replaces the outside-sales and business-cash multipliers rather than stacking on them. Speed: no town more than 20 percent slower than base, measured one process at a time on the same machine.

**Done when.** Washington, District of Columbia opened with buildBenchWorld models within 2 percent of its Census reference population (named with the reader and its value), and npm run speed:year -- --place 1150000 --exclusive and --place 3651000 (the largest town) each run no more than 20 percent slower than clean main on the same machine; the changed and affected tests (census-firms, counted-weight, electorate-weight, census-weight-economy, census-scale-closures) pass or fail only as on main.

**Files.** src/bench/world.ts, src/core2/census-firms.ts, src/core2/world-settings.ts, src/core2/census-firms.test.ts

**Notes.** Split from core-census-uncap-opening on Oct 23 by claude/sleepy-carson-f8omzd: the parent's two-minute line for the largest town cannot be met by that PR, because clean main's own New York year takes 335.2 s on the 4-core container; that line now waits on core-speed-year-over-limit-dense-town.
