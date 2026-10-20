---
id: release-red-counted-weight-money-opening-payroll
title: "counted-weight-money test: an opening payroll posting exceeds its bound, 5,819,280 against 5,554,574 (Unadilla, New York, seed 5a77dbcd)"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Oct 20 (claude/counted-weight-payroll): the failure is in the test, not the money. In Putnam, Connecticut (seed e00f2757...) and Franklin Lakes, New Jersey (seed 4c7e8db2...) the scaled world's opening payroll pays 116 jobs where the single-household run paid 113, because the opening's job allocation follows the counts, so scaling the base payment by a mean weight overshoots by about 3 percent. The test now compares each payroll with what its own jobs are owed (one day's pay over its jobs, weighted by each counted job's household, times the days the base run paid), skips a base run that paid part of a day, and keeps the tax and "none pays more" checks. A second failure, "rents compared: 0" in Remy, Oklahoma (seed 421f27e7...), was a town with no counted rent flows: the test now redraws up to three times and names the places it skipped. The Remy finding is filed as `world-no-counted-rent-flows-small-town`. `CWM_SEED` and `CWM_KEY` replay a draw.
