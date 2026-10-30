---
id: core-speed-electorate-id-order
title: "The electorate sorts every counted resident by id each time its list is rebuilt, and works out each survey cell's state and age band again per person"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: speed/cut-electorate
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T08:02:30.580Z
---

**What.** countedResidents and countedResidentsOf in src/core2/electorate.ts rebuild the counted voters' list when the store changes and sort it by id with localeCompare every time, though the store only grows at its end. surveyCell looks up each place's state and each age's band for every person. Counting votes and turnout read these lists in every election, so an election year runs them many times a day.

**Rules.** Speed: a country's year runs under 120 seconds, and no change makes it more than 20 percent slower. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** the electorate keeps one id order per counted store, placing new members by binary search, and surveyCell keeps each place's state and each age's band; npm run speed:year -- --seed long-1 --years 2 on main and on the branch, one process at a time, keeps dev mode's records proof identical in every table of the played world at year 2, with both runs' times in the PR body.

**Files.** src/core2/electorate.ts

**Notes.** TODO
