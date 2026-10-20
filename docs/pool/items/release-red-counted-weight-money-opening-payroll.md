---
id: release-red-counted-weight-money-opening-payroll
title: "counted-weight-money test: an opening payroll posting exceeds its bound, 5,819,280 against 5,554,574 (Unadilla, New York, seed 5a77dbcd)"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/fs11vb-rr2
pr: #5331
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:25:59.280Z
---

**What.** src/core2/counted-weight-money.test.ts failed on main on most random draws because it scaled the single-household run's opening payroll by a mean household weight, while the scaled world's opening pays more jobs (116 against 113 in Putnam, Connecticut), so the scaled payroll came out about 3 percent over its bound; a second failure, rents compared 0, came from towns with no counted rent flows. The money is right and the test is wrong. Compare each payroll with what its own jobs are owed (one day's pay over its jobs, weighted by each counted job's household, times the days the base run paid), skip a base run that paid only part of a day, and redraw up to three times when a town has no counted rent, failing if none pays any. PR #5331 (branch claude/counted-weight-payroll) built this and was sent back; finish it on that branch after merging main.

**Rules.** Replace, never layer: the scaled-mean comparison is replaced, not kept beside the new one, and the bound is not loosened. One rule, all 56 places: the test draws its place and names the places it skipped. Every dollar must balance: the none-pays-more and tax checks stay as they are.

**Done when.** src/core2/counted-weight-money.test.ts passes on the two seeds that failed (Putnam, Connecticut and Franklin Lakes, New Jersey) and on three fresh drawn places named in the PR body, fails when a payroll pays more than its jobs are owed, and finishes inside its stated time limit with the reason for that limit written beside it.

**Files.** src/core2/counted-weight-money.test.ts

**Notes.**
Sent back 2026-10-20 from PR #5331 (branch claude/counted-weight-payroll): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Oct 20 (pool feeder): write-up filled from PR #5331's body; the town with no counted rent is filed as world-no-counted-rent-flows-small-town.
