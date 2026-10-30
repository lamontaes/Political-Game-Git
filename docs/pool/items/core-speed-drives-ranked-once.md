---
id: core-speed-drives-ranked-once
title: "Every act a drive holder considers ranks their drives again and scans every cause group on the topic (Ringgold, Louisiana 2028: drives 14.8 s against 0.6 s in 2025)"
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

**What.** Each time a person with drives looks at what to do, the drives engine's offer rows (src/core2/modules/drives.ts known-cause-group, volunteer-place, drive-confidant) rank all their drives by strength and walk every cause group on the topic, building a fresh lookup key per group. A 2028 profile of one Ringgold, Louisiana save (seed long-1) put the drives engine at 14.8 s against 0.6 s in 2025, its offer rows inside availableActs at 5.7 s and groupKnown at 3.1 s. The join and donate offers each make the same group list.

**Rules.** Speed: a country's year runs under 120 seconds, and no change makes it more than 20 percent slower. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** servingDrives ranks each person's drives once a day, each topic's cause groups are one sorted list with stored lookup keys and nearby groups checked first, and one offer round shares the group list between join-cause-group and donate-to-cause; npm run speed:year -- --seed long-1 --years 4 on main and on the branch, one process each, keeps dev mode's records proof identical in every table of the played world at year 4, with the times in the PR body.

**Files.** src/core2/modules/drives.ts, src/core2/life.ts, src/core2/types.ts

**Notes.** TODO
