---
id: core-speed-world-races-election-month
title: "The election month runs seven times an ordinary month: every race elsewhere counts thousands of places against a fresh sample"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Bedford, Wyoming (key 5606045, seed 9a4dd331ace7), the month that ends on election day 2026 takes 17.0 s against 2.3 s for an ordinary month. Profiled, 7.75 s of that month's growth is decide in src/core2/modules/world-races.ts: 582 races elsewhere decided that month (438 House, 34 Senate, 35 governors, 75 state legislative), 5,138 places in all, each place counted coarsely in src/core2/electorate.ts with coarseSampleVoters (400, TUNABLE) of the town's counted adults standing for its voters. The cost is the same for every town, so a small town's election month is mostly other places' races. Sarasota, Florida's year two, which holds that month, runs 182 to 213 s.

**Rules.** Speed: a town's game year must run in under two minutes, and no change may make a year more than 20 percent slower than its base. One rule, all 56 places: every state's races are counted by the same rule. No dice: the counted share of each place decides, never a draw. Owner decisions are flagged, never waited on: whether a House race is counted per place or per state is a design call the builder makes simply and flags.

**Done when.** In the played world (buildBenchWorld), Bedford, Wyoming (seed 9a4dd331ace7, key 5606045) and a place drawn from all 56 (named with its seed), two played years: the month ending on the 2026 election day runs within 2 times an ordinary month, decide's inclusive time in a CPU profile of that month falls by at least half, and every race elsewhere has the same winner as before (a test names the races and their record ids), with any share that moves reported with its size.

**Files.** src/core2/modules/world-races.ts, src/core2/electorate.ts, src/core2/data/electorate/parameters.json

**Notes.** Filed Oct 25 by the speed lead from the Bedford month-by-month profile (main a351e12f45). The same place counted again for each race it votes in (House, Senate, governor, legislature) may be the first cut: a place's coarse count does not change between its races on one day.
