---
id: tests-press-staff-cash-red-on-main
title: "press-staff-cash.test.ts is red on clean main: a national cable head's opening cash differs from the survey balance the test expects"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: sonnet
effort: high
root: none
---

**What.** src/core2/press-staff-cash.test.ts fails on clean main (Oct 28, 20:40 UTC, merged with the vacant-seat fix). In Roslyn Heights, New York (3663814), at the test's pinned seed cbde9425c9b39c9028eb1b3abe5ce48509818e965fd5d5e38b0673d16bb83741, person:press:outlet:cable:0:national:head:0 opens with 711942 where the test expects 948308. The two numbers differ by about a quarter, which suggests the opening balance now draws its per-world spread while the test still expects the survey value. The cause is not traced yet, and the test takes its household from officialHousehold in src/core2/official-living.ts.

**Cause.** Needs cause. Looked at src/core2/press-staff-cash.test.ts, officialHousehold in src/core2/official-living.ts and src/core2/modules/press.ts: which writer sets the outlet head's opening cash, and whether the per-world spread or the test's expectation is wrong, was not read. Measured: Roslyn Heights, New York, seed cbde9425c9b39c9028eb1b3abe5ce48509818e965fd5d5e38b0673d16bb83741.

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** Never weaken a test to get green: find which writer sets the press staff's opening cash and whether the per-world spread (estimate-not-unknown, realistic not real) or the test's expectation is wrong. Estimate, never UNKNOWN: an opening balance keeps its per-world spread and its source.

**Done when.** A second session runs the press staff cash test on its pinned seed in Roslyn Heights, New York and on ten fresh drawn places in a test world and sees every run pass. The PR names the record id of the outlet head's opening cash and the writer of it by file and line.

**Waits on.** Nothing.

**Files.** src/core2/press-staff-cash.test.ts, src/core2/modules/press.ts, src/core2/official-living.ts

**Notes.** lead: red-main. Found by the elections wire session while running the petition line's tests; it fails identically on clean main, so it is not the petition branch's.
