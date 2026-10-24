---
id: core-speed-work-payroll-in-play
title: "Settling a payday does in play only what play reads (Long Hill: 22 s of the year)"
area: core
kind: bug
priority: 1
size: M
status: in-pr
claimed-by:
pr: #5925
blocked-on: core-speed-work-attendance-in-play
source: added with npm run pool -- add
claimed-at:
---

**What.** Settling work payroll takes 22.3 of 264 profiled seconds of a played year in Long Hill, Connecticut (seed m7b), 6.8 of them in the cash journal and the rest in preparing the settlement. The cash source provider, prepare, copy and same in work-payroll-cash.ts and prepareWorkPayAccrual in work-pay-period.ts rebuild and compare detached copies of each commitment's period and ledger for every payday, with bookkeeping off. Play should read the live period and ledger and post the payment; the copies and comparisons stay under the bookkeeping switch so tests keep them.

**Rules.** Bookkeeping is a debug switch: copies, freezing and validation run in tests, not in play. Speed: no change makes a year slower, measured before and after on the same machine. No dice: every paycheck stays the same amount on the same day.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b) the year's fingerprint from npm run speed:year stays fcdd81f3359b and a drawn place's three-year fingerprints are unchanged; settleWorkPayroll's inclusive time outside the journal in a CPU profile falls by at least half; the payroll and work tests pass, with the speed lead's before and after in the PR body.

**Files.** src/core2/work-payroll-cash.ts, src/core2/work-pay-period.ts

**Notes.** Filed Oct 24 by the speed lead. Same helper as core-speed-work-attendance-in-play, after it.

Sent back 2026-10-24 from PR #5925 (branch claude/speed-work-payroll): the explicit attendance prerequisite #5924 remains open and unmerged, so the carried work-pay-period stack must wait for that review; finish on that branch, merge main into it first after #5924 merges. No local gate, speed or fingerprint claim is made.
