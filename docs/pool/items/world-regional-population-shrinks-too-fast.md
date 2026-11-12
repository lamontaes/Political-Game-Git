---
id: world-regional-population-shrinks-too-fast
title: "Twenty state regions lose people faster in a played year than any real state's 5th-percentile year"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: sonnet
effort: high
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** M1-13's population-range clause (src/bench/m1-13-check.ts, against stateOneYearPopulationChangePct in data/research/regional/series/stats.json: Census Bureau state estimates 2000-2024, 5th percentile -0.20%, 95th 2.02%) reported 20 of 128 state regions below -0.20% from December 2024 to December 2025 in both towns measured: Coleharbor, North Dakota (3815140, seed b77e10b747310cbaf1e4a546cbd529383aa3d8b9a5df538301d0b8c536f52c7c) and Teaticket, Massachusetts (2569205, seed 02e3ea1d6d3cf757e30d502fac0861b63e969ac718c9c095e58294a9445fa0c5). Alaska's rest fell 1.18% and Anchorage 1.11%, Colorado's rest 1.09% and Denver 1.07%, Oregon's rest 0.84% and Portland 0.80%, and California, Washington D.C., New Jersey, Virginia, Massachusetts, Washington, Illinois and Michigan fell too; no region grows above 1.15% and the median is +0.32%. Find what takes a region down by more than a percent in a year and whether it follows from its causes.

**Cause.** Needs cause. Looked at src/core2/regional-model.ts and src/bench/m1-13-check.ts (the band check at lines 114 to 124): `stepRegionMonth`, which the item blamed, is gone (the file now has `publishedRegionMonths`, `openingRegionMonths` and `regionMonthFromState`), so the stated cause is stale, and the 20 regions below -0.20% have not been re-measured against the current regional code.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the population of the player's state and town on the Metrics tab, shrinking faster than any real state.

**Rules.** Real rates check totals; they never pick an outcome, and a region outside the Census range is reported, not failed (No dice; owner, Nov 8: ranges are not targets). One rule, all 56 places: the cause is fixed in the rule, never by naming a state. Sliding scales and causes: a region's population changes from its births, deaths and moves, each from its conditions.

**Done when.** A second session, on main in the two drawn places Coleharbor, North Dakota and Teaticket, Massachusetts (seeds above), runs the m1-13 check (node --max-old-space-size=8192 --import tsx src/bench/m1-13-check.ts) and plays a year in dev mode: the check prints each region's one-year change beside the Census range as a report, and for any region that falls by more than a percent the pull request names by file and line what took it there and shows its births, deaths and moves by record id. The regional and counted-moves tests pass.

**Waits on.** Nothing.

**Files.** src/core2/regional-model.ts, src/core2/modules/regional.ts, src/core2/modules/counted-moves.ts, src/bench/m1-13-check.ts

**Notes.**

Stopped on the owner's order, Oct 28 (claude pool worker); nothing built. Finding: m1-13-check in Coleharbor (3815140, seed b77e10b7…) has 20 of 132 regions outside the band; `stepRegionMonth` (src/core2/regional-model.ts) moves population only by the unemployment-gap migration, with no national growth term. Census state totals 2000-2024 give the nation 0.755 percent a year (p05 0.367, p95 0.979, 24 yearly changes of the 50 states plus D.C.; st-est00int-alldata, nst-est2020-alldata, NST-EST2024-ALLDATA). Next: add that as a SOURCED parameter and a monthly term, then rerun m1-13 (about 30 minutes).
