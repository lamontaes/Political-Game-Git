---
id: core-speed-voting-sample-once
title: "Counting each place's votes bisects the same coarse electorate again for every place and race of the day (Ringgold, Louisiana 2028: about 8 s)"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: speed/cut-voting
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T09:24:16.650Z
---

**What.** On an election day, countPlaces in src/core2/electorate.ts places every voter of the coarse sample with a 24-step bisection (orderPlacement) for each of the fifty states, every race's decide and the town's own count, though the sample and its placement are the same all day. A 2028 profile of one Ringgold, Louisiana save (seed long-1) put that bisection at 8.2 s of countPlaces' 10.9 s, and turnoutShare at 6.8 s, reading its two parameters again for every voter. rosterDistricts in src/core2/offices-state.ts also keys every roster name again on each call.

**Rules.** Speed: a country's year runs under 120 seconds, and no change makes it more than 20 percent slower. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** orderPlacement keeps each midpoint's share, the day's coarse sample and its placement are worked out once and shared, the turnout rule reads its parameters once per count, and each roster's district keys are kept; npm run speed:year -- --seed long-1 --years 4 on main and on the branch, one process each, keeps dev mode's records proof identical in every table of the played world at year 4, with the times in the PR body.

**Files.** src/core2/electorate.ts, src/core2/turnout.ts, src/core2/offices-state.ts

**Notes.** TODO
