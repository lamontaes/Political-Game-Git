---
id: core-speed-counted-population-month
title: "The counted population's monthly engines rebuild households, rates and destination rows for every person they touch (Grand Haven, Michigan: about 20 s of the year)"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: speed/cut-counted-population
pr: #6932
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T08:02:03.949Z
---

**What.** The counted population's money settling (src/core2/modules/residents.ts and src/core2/counted-money.ts), its moves month (src/core2/modules/counted-moves.ts) and its births and deaths (src/core2/births-counted.ts) rebuild the same lists and rates again and again. A Grand Haven, Michigan profile (seed spd-d, a 223 s profiled year) put runResidentsDay at 11.9 s and applyCountedFlows at 10.0 s. Each place's leaving rates, home states and destination rows are worked out per household, a throwaway household object is built per household per call, and a due mother's household is found by scanning the town.

**Rules.** Speed: a country's year runs under 120 seconds, and no change makes it more than 20 percent slower. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** the counted engines work out each month's rates and rows once, walk the counted store directly, and find a due mother's household through the store's index; npm run speed:year -- --seed long-1 --years 2 on main and on the branch, one process at a time, keeps dev mode's records proof identical in every table of the played world at year 2, with both runs' times in the PR body.

**Files.** src/core2/counted-money.ts, src/core2/modules/residents.ts, src/core2/modules/counted-moves.ts, src/core2/births-counted.ts

**Notes.** TODO
