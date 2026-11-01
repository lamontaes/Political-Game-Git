---
id: core-speed-prestart-history-insert
title: "Speed: past work reads past records by kind without scanning the whole history"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When the game fills in a person's work history, it reads every past record to find the town's economic conditions and the businesses founded before the start. That read grows with every person filled in before them. Keep those records by kind beside the history, kept by the same writers, so each fill-in reads only what it needs. Found in a profile of Storrs, Connecticut (key 0973980), the Every place nightly's slowest place (530 s, then 1,075 s a year).

**Rules.** Speed: a country's year runs under 120 seconds; never scan the whole world or a whole history again for each person or each step. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** A one-year Storrs, Connecticut run shows no time growing in those reads by kind. Its proof, and a four-year Ringgold, Louisiana proof, each show zero differing tables against main; npm run speed:year -- --seed long-1 --years 4 and --seed storrs-1 --place 0973980 --years 1 on main and on the branch, one process each, keep dev mode's records proof identical in every table, with the times in the PR body.

**Files.** src/core2/pre-start.ts

**Notes.** Lead: speed.
