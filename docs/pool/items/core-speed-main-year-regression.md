---
id: core-speed-main-year-regression
title: "The Long Hill played year is about 280 s on main, up from 196 to 233 s earlier the same day"
area: core
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/speed-main-regression
pr: #5834
blocked-on:
after: core-speed-public-staff-full-people
source: added with npm run pool -- add
claimed-at: 2026-10-22T05:25:11.697Z
---

**What.** On Oct 20, 2026 the played year in Long Hill, Connecticut (seed m7b, key 0943580, npm run speed:year -- --seed m7b --exclusive, one process at a time on a 4-core cloud container) took 196 to 233 s in my runs before about 02:00 UTC and 279.2 s on origin/main at about 14:30 UTC (284.8 s with the arrears write-off change on top). Other changes landed on main in between, and this container's noise is about plus or minus 10 percent, so the rise is larger than noise. Find which merged change raised the year, from the commits between the two and a CPU profile (node --cpu-prof) of the year compared by inclusive time per function, and fix it or file it as its own item.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. One rule, all 56 places: the check names its place and seed.

**Done when.** A CPU profile of the played world in the drawn place Long Hill, Connecticut (seed m7b) on main, compared with a profile before the rise, names the function whose inclusive time grew, and a fix or its own pool item follows; npm run speed:year -- --seed m7b --exclusive returns to at most 233 s in the PR body receipts, and the speed test guard passes.

**Files.** src/core2/life.ts, scripts/speed-years/run.ts

**Notes.** Measured Oct 22 (claude) on one 4-core cloud container, one process at a time, with `node --cpu-prof` (the profiler adds its own cost, so compare within a column):

| Main at                             | Commit               | Year with profiler | Profile total |
| ----------------------------------- | -------------------- | ------------------ | ------------- |
| Oct 20, 01:59 UTC (before the rise) | 1114a7b0f1           | 163.0 s            | 195.6 s       |
| Oct 20, 14:29 UTC (the rise)        | 25daaa399e           | 147.5 s            | 178.7 s       |
| Oct 22                              | e5954a72fb and later | 157.9 s            | 186.4 s       |

Without the profiler, main on Oct 22 ran the year in 186.7 s (`npm run speed:year -- --seed m7b --exclusive`). The rise to 279 s does not reproduce: the commit it was measured on is the fastest of the three here, so that reading was the container, not the code. Comparing inclusive time per function, before against the rise, nothing grew by more than 2 s. The rise against Oct 22 names one growth: `staffReview` (src/core2/modules/staff.ts) from 0.9 s to 7.0 s, of it `staffCandidates` from 0.4 s to 4.2 s. It walks every person in the world for each official's review, and is filed as core-speed-staff-candidates-scan.
