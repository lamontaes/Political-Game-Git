---
id: core-long-run-campaign-day-indexes
title: "Campaign day and press desk read interviews by day and by race"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: speed/cut-campaign-day-scans
pr: #7025
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T18:51:32.258Z
---

**What.** The campaign day's interview choice and the press desk's invitations walked every interview an outlet or a candidate ever had, on every check, and each kept its own copy of the weekly room rule. The walk grows with the save. By year four of the Ringgold save an outlet holds about 77 interviews, so the cost is small now and grows over a long save. It was not measured on its own. Part of core-long-run-tables-grow-with-history.

**Rules.** Speed: a country's year runs under 120 seconds, and years 97 to 100 of a save run at most 1.2 times years 1 to 4; never scan the whole world or its history every day. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** The campaign day and the press desk share one week count that reads only the outlet's last seven days. A candidate's interviews for one race come from their own index. The four-year Ringgold proof shows zero differing tables against main; npm run speed:year -- --seed long-1 --years 4 on main and on the branch, one process each, keeps dev mode's records proof identical in every table of the played world at year 4 in the played world (buildBenchWorld), the tests the PR names pass, with the times in the PR body.

**Files.** src/core2/campaign-day.ts, src/core2/modules/press.ts, src/core2/press.test.ts

**Notes.** TODO
