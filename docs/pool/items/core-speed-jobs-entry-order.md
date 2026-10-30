---
id: core-speed-jobs-entry-order
title: "The monthly job review asks each counted adult about custody before their age, and works out each place's immigration enforcement and citizen share again per person"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: speed/cut-jobs-entry
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T08:01:47.224Z
---

**What.** reviewCountedEntry in src/core2/modules/jobs.ts asks the justice engine whether each counted adult without a job is in custody before it checks their age, so children are looked up too. bandShift in src/core2/jobs-web.ts reads the place's immigration enforcement factors for every person, and citizenShareOf in src/core2/electorate-places.ts recomputes a place's citizen share from static tables on every call. Under the Grand Haven, Michigan profile (seed spd-d) the review's custody check was 0.44 s and the entry path 13 s in all.

**Rules.** Speed: a country's year runs under 120 seconds, and no change makes it more than 20 percent slower. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** reviewCountedEntry tests age before custody, bandShift keeps one enforcement answer per place a day, and citizenShareOf keeps its static answer in play; npm run speed:year -- --seed long-1 --years 2 on main and on the branch, one process at a time, keeps dev mode's records proof identical in every table of the played world at year 2, with both runs' times in the PR body.

**Files.** src/core2/modules/jobs.ts, src/core2/jobs-web.ts, src/core2/electorate-places.ts

**Notes.** TODO
