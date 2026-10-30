---
id: core-speed-weighed-id-scan
title: "Each weighed decision the player makes searches its day's ids one by one, so a presidential year runs 15 s slower (Ringgold, Louisiana)"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: speed/weighed-id-counter
pr: #6889
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T03:16:30.174Z
---

**What.** A CPU profile of year 4 (2028, a presidential election year) of one Ringgold, Louisiana save (speed:year seed long-1, about 1,300 people) puts keepWeighing in src/core2/trait-decisions.ts at 15.5 s of self time of a 155 s year. Each time the player or a focus person weighs a two-way decision (the press's interviews ask the player's party firmness over and over), keepWeighing writes a person.weighed record and finds its id by trying weighed:<date>:<decision>:<person>, then :2, :3 and so on against the event log, so the search grows with every weighing that day. The same save's 2025 runs 52 s; 2028 runs 155 s, over the 120-second bar.

**Rules.** Speed: a country's year runs under 120 seconds, and no change makes it more than 20 percent slower. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** keepWeighing finds each record's id without trying every id taken that day; npm run speed:year -- --seed long-1 --years 4 on main and on the branch, one process at a time, keeps dev mode's records proof identical in every table at year 4 and shows year 4 faster, with the times in the PR body.

**Files.** src/core2/trait-decisions.ts

**Notes.** TODO
