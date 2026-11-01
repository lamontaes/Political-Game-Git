---
id: core-speed-hiring-ranked-once
title: "Speed: hiring order (rank job applicants once per opening)"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: speed/cut-hiring-order
pr: #7014
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T18:05:26.638Z
---

**What.** For each open job, the employer scanned every applicant to find the best one. It scanned the whole line again after each applicant who said no. So the time grew with the square of the applicants. In a profiled replay of Storrs, Connecticut's second year, this took about 150 seconds. The fix ranks each opening's applicants once and walks down the ranking, picking exactly whom the scan would. Found in a profile of Storrs, Connecticut (key 0973980), the Every place nightly's slowest place (530 s, then 1,075 s a year).

**Rules.** Speed: a country's year runs under 120 seconds; never scan the whole world or a whole history again for each person or each step. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** In the played world (npm run speed:year, which builds it with buildBenchWorld), Ringgold, Louisiana over four years (seed long-1) and Storrs, Connecticut over one (key 0973980, seed storrs-1) keep dev mode's records proof identical to main in every table; the tests that hire (src/core2/jobs.test.ts and the others the PR names) pass with bookkeeping on, which runs the old scan beside the ranking and throws on any difference; and a profile of Storrs's second year shows the hiring step falling, with the times in the PR body.

**Files.** src/core2/modules/jobs.ts

**Notes.** Lead: speed.
