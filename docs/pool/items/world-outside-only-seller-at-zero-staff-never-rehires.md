---
id: world-outside-only-seller-at-zero-staff-never-rehires
title: "A factory that loses its last worker never hires again and sells nothing for good"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: world-founded-business-outside-sales-flow-starts-at-zero
lead: jobs
model: opus
effort: medium
root: none
source: found by Account lead T34 while fixing world-founded-business-outside-sales-flow-starts-at-zero
claimed-at:
checked:
---

**What.** A business whose buyers are all outside the town (a small factory) that drops to zero staff, because its one worker quits, moves, retires or dies, can never post a job again, so its outside sales stay at zero while it lives on its cash. Seen by reading the code and the founding runs: before the founding fix, every one-person founded factory at Skagway, Alaska (US-AK 0270760, buildBenchWorld seed 8f3ccb88950177eb7865cdf9e9309e08981110a90485863070461caa82dfce65, twoLevel) sat at staff 0 and outside sales 0 for its whole life by this mechanism. With the fix in place, a manufacturer there founded 2026-01-01 hired by month 5 and read 0 outside sales at month 12; whether its staff had fallen to 0 was not checked and is the first thing to confirm. Seen: the town's business list and its jobs, where such a factory employs nobody and sells nothing month after month instead of rehiring or closing.

**Cause.** Found in code: the hold that fixes the founding does not apply here, because this firm has hired before. With staff 0 its service level is 0 (`firmStaffing` in src/core2/modules/jobs.ts), so `divideOutsideSales` (src/core2/residents-economy.ts) gives its outside buyers to its rivals and its receipts read zero. `reviewEmployers` (jobs.ts) then lowers its target from those receipts (`observedStaff`) and from the books' demand (`projected`), so the gap shrinks below 1, and `need`, which grows by `jobsStaffGapActedPerMonth` x gap x cash reach a month, levels off below the one job it needs to post. A leaver's replacement (`owed`) should start the posting. Check why it does not here: the leaver record may be missing when the worker left outside the jobs engine, or the leaver may have been dropped once the target fell below the staff. Needs cause for that last step.

**Fix.** None until the leaver step is traced. The likely shape: a firm short of its only worker reads the demand it turned away (the raw outside spending before the division), not its own curtailed receipts, when it sets its target. That reading belongs to the jobs engine's demand target, the one reader.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** No dice. One rule, all 56 places: the check draws its place and names it with the seed. Real failure rates calibrate, never target.

**Done when.** A second session plays a 1,095-day world at Skagway with the seed above and two drawn places, and every live business whose staff fell to zero either posts a job within two monthly reviews or closes, named by organization id; a test beside src/core2/market-entry-opening-staff.test.ts covers it; a year of `speed:year` is within 20% of its base. On screen: the town's business list and its jobs.

**Waits on.** world-founded-business-outside-sales-flow-starts-at-zero (on the train).

**Files.** src/core2/modules/jobs.ts

**Notes.** Filed by hand on the Account lead T34 branch.
