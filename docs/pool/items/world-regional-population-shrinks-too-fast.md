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
model: haiku
effort: low
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** M1-13's population-range clause (src/bench/m1-13-check.ts, against stateOneYearPopulationChangePct in data/research/regional/series/stats.json: Census Bureau state estimates 2000-2024, 5th percentile -0.20%, 95th 2.02%) reported 20 of 128 state regions below -0.20% from December 2024 to December 2025 in both towns measured: Coleharbor, North Dakota (3815140, seed b77e10b747310cbaf1e4a546cbd529383aa3d8b9a5df538301d0b8c536f52c7c) and Teaticket, Massachusetts (2569205, seed 02e3ea1d6d3cf757e30d502fac0861b63e969ac718c9c095e58294a9445fa0c5). Alaska's rest fell 1.18% and Anchorage 1.11%, Colorado's rest 1.09% and Denver 1.07%, Oregon's rest 0.84% and Portland 0.80%, and California, Washington D.C., New Jersey, Virginia, Massachusetts, Washington, Illinois and Michigan fell too; no region grows above 1.15% and the median is +0.32%. Find what takes a region down by more than a percent in a year and whether it follows from its causes.

**Cause.** Measured: does not reproduce on main d64255aa (Nov 11). `GOLDEN_PATH_SEED=<seed> GOLDEN_PATH_PLACE_KEY=<key> node --max-old-space-size=8192 --import tsx src/bench/m1-13-check.ts` in both named towns (Coleharbor, North Dakota, 3815140, and Teaticket, Massachusetts, 2569205, seeds above) reads 8 of 132 regions outside their band, and none of them falls. No region drops below the states' 5th percentile of -0.20 percent. The 8 outside are small gains: the D.C. metro (region:11:metro:47900) at +2.19 percent and three Florida regions (region:12:metro:33100, region:12:metro:45300, region:12:rest) at +2.07 percent, just above the states' 95th percentile of 2.02, plus the four island territories (regions 60, 66, 69 and 78) at +1.52 percent each, against the territories' band of -2.32 to +0.65 percent (World Bank). Regions now move with their state's figures (`regionMonthFromState` in src/core2/regional-model.ts, fed by the country model in src/core2/country-model.ts), which replaced the `stepRegionMonth` this item blamed. The check took 32 seconds in each town. Its remaining failures are about other places' voters' views and state jobs reports, not population.

**Fix.** Nothing to build for this item. The CTO drops it as done by main. Real ranges are not targets (owner, Nov 8), so the slight gains in D.C. and Florida are reported, not fixed. All four territories growing exactly 1.52 percent looks like one shared rule rather than four places' own figures. If the CTO wants it looked at, it is a new item on how the country model steps a territory's people.

**Time box.** 0.5 hours for the CTO to read this and drop the item. Seen: the population of the player's state and town on the Metrics tab, shrinking faster than any real state.

**Rules.** Real rates check totals; they never pick an outcome, and a region outside the Census range is reported, not failed (No dice; owner, Nov 8: ranges are not targets). One rule, all 56 places: the cause is fixed in the rule, never by naming a state. Sliding scales and causes: a region's population changes from its births, deaths and moves, each from its conditions.

**Done when.** A second session, on main in the two drawn places Coleharbor, North Dakota and Teaticket, Massachusetts (seeds above), runs the m1-13 check (node --max-old-space-size=8192 --import tsx src/bench/m1-13-check.ts) and plays a year in dev mode: the check prints each region's one-year change beside the Census range as a report, and for any region that falls by more than a percent the pull request names by file and line what took it there and shows its births, deaths and moves by record id. The regional and counted-moves tests pass.

**Waits on.** Nothing.

**Files.** src/core2/regional-model.ts, src/core2/modules/regional.ts, src/core2/modules/counted-moves.ts, src/bench/m1-13-check.ts

**Notes.**

Stopped on the owner's order, Oct 28 (claude pool worker); nothing built. Finding: m1-13-check in Coleharbor (3815140, seed b77e10b7…) has 20 of 132 regions outside the band; `stepRegionMonth` (src/core2/regional-model.ts) moves population only by the unemployment-gap migration, with no national growth term. Census state totals 2000-2024 give the nation 0.755 percent a year (p05 0.367, p95 0.979, 24 yearly changes of the 50 states plus D.C.; st-est00int-alldata, nst-est2020-alldata, NST-EST2024-ALLDATA). Next: add that as a SOURCED parameter and a monthly term, then rerun m1-13 (about 30 minutes).

Nov 11 (cause finder for Fable B): reran the m1-13 check on main d64255aa in both named towns. No region shrinks past the band any more; the 8 outside are gains (D.C., Florida and the four territories at an identical +1.52 percent). I printed the regions outside the band with a temporary change to the check, since undone. I propose dropping the item as done by main.
