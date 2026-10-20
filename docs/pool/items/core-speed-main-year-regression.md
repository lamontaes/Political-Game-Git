---
id: core-speed-main-year-regression
title: "The Long Hill played year is about 280 s on main, up from 196 to 233 s earlier the same day"
area: core
kind: bug
priority: 1
size: M
status: blocked
claimed-by: claude/speed-regression
pr:
blocked-on: core-speed-public-staff-full-people
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:01:48.088Z
---

**What.** On Oct 20, 2026 the played year in Long Hill, Connecticut (seed m7b, key 0943580, npm run speed:year -- --seed m7b --exclusive, one process at a time on a 4-core cloud container) took 196 to 233 s in my runs before about 02:00 UTC and 279.2 s on origin/main at about 14:30 UTC (284.8 s with the arrears write-off change on top). Other changes landed on main in between, and this container's noise is about plus or minus 10 percent, so the rise is larger than noise. Find which merged change raised the year, from the commits between the two and a CPU profile (node --cpu-prof) of the year compared by inclusive time per function, and fix it or file it as its own item.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. One rule, all 56 places: the check names its place and seed.

**Done when.** A CPU profile of seed m7b on main, compared with a profile before the rise, names the function whose inclusive time grew, and a fix or its own pool item follows; npm run speed:year -- --seed m7b --exclusive returns to at most 233 s in the PR body receipts.

**Files.** src/core2/life.ts, scripts/speed-years/run.ts

**Notes.** TODO

Bisected Oct 20 (claude/political-game-pool-b6g0dl; seed m7b, Long Hill, Connecticut, npm run speed:year -- --seed m7b --exclusive, one process at a time, one run per commit; first-parent PR merges on main, newest first): 8ea4a6da3 (after #5237) 290.5 s; 4699fe5ae (#5084) 275.4 s; d6927a488 (#5143) 278.9 s; 068106bda (#5350) 271.8 s; fa11ce6e5 (#5346) 269.7 s; 0a4bf1e41 (#5044, school staff pay) 256.7 s; e715c5bc7 (#5137) 220.3 s; d76b0f16e (#5051) 214.2 s. The step is #5044: +36 s, then +13 s with #5346, inside the container's plus or minus 10 percent. #5044 links the public school district to the town's government so the treasury pays its teachers, and its own PR says "staff of a funded employer are kept full: Deale has 45 teachers as full people where it had 3" (it measured a 19 s village year, not a dense town). Every extra full person acts each day (perform, activate, work onDay, relationship changes, news telling), which is the growth the profile shows. Filed as core-speed-public-staff-full-people.
