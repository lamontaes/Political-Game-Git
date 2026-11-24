---
id: core-long-run-campaign-history-scans
title: "Rival word skips quiet races; cause folds read each voter once"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: speed/cut-campaign-scans
pr: #7024
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T18:51:24.999Z
---

**What.** Each day, the campaigns engine walked every filing ever made and ran two lookups for each standing candidate, even in races with no message all week. That cost grows as a save gets older. Folding a race's contacts also rebuilt each voter's knowledge list once for every candidate. In the four-year Ringgold run, both steps together took under 1.3 seconds a year, so the gain shows in long saves. Part of core-long-run-tables-grow-with-history.

**Rules.** Speed: a country's year runs under 120 seconds, and years 97 to 100 of a save run at most 1.2 times years 1 to 4; never scan the whole world or its history every day. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** A four-year Ringgold run matches main in every table. A drawn-world test shows the kept message dates match the records after removals, a restore and a new message; npm run speed:year -- --seed long-1 --years 4 on main and on the branch, one process each, keeps dev mode's records proof identical in every table of the played world at year 4 in the played world (buildBenchWorld), the tests the PR names pass, with the times in the PR body.

**Files.** src/core2/campaign-rival-word-kept.test.ts, src/core2/modules/campaigns.ts

**Notes.** TODO
