---
id: world-regional-population-shrinks-too-fast
title: "Twenty state regions lose people faster in a played year than any real state's 5th-percentile year"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** M1-13's new population-range clause (src/bench/m1-13-check.ts, against stateOneYearPopulationChangePct in data/research/regional/series/stats.json: Census Bureau state estimates 2000-2024, 5th percentile -0.20%, 95th 2.02%) fails in both towns measured: Coleharbor, North Dakota (3815140, seed b77e10b747310cbaf1e4a546cbd529383aa3d8b9a5df538301d0b8c536f52c7c) and Teaticket, Massachusetts (2569205, seed 02e3ea1d6d3cf757e30d502fac0861b63e969ac718c9c095e58294a9445fa0c5). From December 2024 to December 2025, 20 of 128 state regions fall below -0.20%: Alaska's rest -1.18% and Anchorage -1.11%, Colorado's rest -1.09% and Denver -1.07%, Oregon's rest -0.84% and Portland -0.80%, California -0.67% and -0.64%, Washington D.C. -0.66%, New Jersey, Virginia, Massachusetts, Washington, Illinois and Michigan. No region grows above 1.15%; the median is +0.32%. The regional step moves population only by migration (src/core2/regional-model.ts stepRegionMonth, regionalMigrationPerUnemploymentPoint 0.25% a year per point of the gap), which cannot reach -1.1% in Colorado from a gap near zero, so another reader (counted moves weighing these states, or a population the step does not own) is the likely cause.

**Rules.** Real rates check totals; they never pick an outcome (No dice). One rule, all 56 places: the cause is fixed in the rule, never by naming a state. Sliding scales and causes: a region's population changes from its births, deaths and moves, each from its conditions.

**Done when.** In two towns drawn from all 56 and named with seeds, node --max-old-space-size=8192 --import tsx src/bench/m1-13-check.ts shows no more than a tenth of state regions outside the Census one-year range, the PR names by file and line what took Colorado's regions to -1.1%, and the regional and counted-moves tests pass.

**Files.** src/core2/regional-model.ts, src/core2/modules/regional.ts, src/core2/modules/counted-moves.ts

**Notes.**

Stopped on the owner's order, Oct 28 (claude pool worker); nothing built. Finding: m1-13-check in Coleharbor (3815140, seed b77e10b7…) has 20 of 132 regions outside the band; `stepRegionMonth` (src/core2/regional-model.ts) moves population only by the unemployment-gap migration, with no national growth term. Census state totals 2000-2024 give the nation 0.755 percent a year (p05 0.367, p95 0.979, 24 yearly changes of the 50 states plus D.C.; st-est00int-alldata, nst-est2020-alldata, NST-EST2024-ALLDATA). Next: add that as a SOURCED parameter and a monthly term, then rerun m1-13 (about 30 minutes).
