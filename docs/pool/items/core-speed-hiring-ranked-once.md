---
id: core-speed-hiring-ranked-once
title: "Speed: hiring order (rank job applicants once per opening)"
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

**What.** For each open job, the employer scanned every applicant to find the best one. It scanned the whole line again after each applicant who said no. So the time grew with the square of the applicants. In a profiled replay of Storrs, Connecticut's second year, this took about 150 seconds. The fix ranks each opening's applicants once and walks down the ranking, picking exactly whom the scan would. Found in a profile of Storrs, Connecticut (key 0973980), the Every place nightly's slowest place (530 s, then 1,075 s a year).

**Rules.** Speed: a country's year runs under 120 seconds; never scan the whole world or a whole history again for each person or each step. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** Done when the ranking picks the same people as the scan, with zero differing tables on the Ringgold four-year proof and the Storrs one-year proof. Bookkeeping must run the scan beside the ranking and stop on any difference. A profile of Storrs's second year must show hiring time falling. Done: both proofs show zero differing tables, and hiring fell from 149.9 to 7.2 seconds; npm run speed:year -- --seed long-1 --years 4 and --seed storrs-1 --place 0973980 --years 1 on main and on the branch, one process each, keep dev mode's records proof identical in every table, with the times in the PR body.

**Files.** src/core2/modules/jobs.ts

**Notes.** Lead: speed.
