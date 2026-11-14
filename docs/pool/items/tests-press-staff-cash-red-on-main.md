---
id: tests-press-staff-cash-red-on-main
title: "press-staff-cash.test.ts is red on clean main: a national cable head's opening cash differs from the survey balance the test expects"
area: core
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: haiku
effort: low
root: none
checked: fable 2026-11-10
---

**What.** src/core2/press-staff-cash.test.ts fails on clean main (Oct 28, 20:40 UTC, merged with the vacant-seat fix). In Roslyn Heights, New York (3663814), at the test's pinned seed cbde9425c9b39c9028eb1b3abe5ce48509818e965fd5d5e38b0673d16bb83741, person:press:outlet:cable:0:national:head:0 opens with 711942 where the test expects 948308. The two numbers differ by about a quarter, which suggests the opening balance now draws its per-world spread while the test still expects the survey value. The cause is not traced yet, and the test takes its household from officialHousehold in src/core2/official-living.ts.

**Cause.** Measured: does not reproduce on main. `npx vitest run src/core2/press-staff-cash.test.ts --maxWorkers=1` with GOLDEN_PATH_SEED=cbde9425c9b39c9028eb1b3abe5ce48509818e965fd5d5e38b0673d16bb83741 passed 1 of 1 on main 8c980a59 (Nov 11), as it did on main b4422d346c with that seed and a fresh one (Nov 10). The Oct 28 difference in the outlet head's opening cash (711,942 against 948,308) is gone; which change removed it was not traced.

**Fix.** Nothing to build. Proposed for the CTO: close this item, with the three passing runs.

**Time box.** 1 hour for one Haiku session, only to close the item once the CTO agrees. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Never weaken a test to get green: find which writer sets the press staff's opening cash and whether the per-world spread (estimate-not-unknown, realistic not real) or the test's expectation is wrong. Estimate, never UNKNOWN: an opening balance keeps its per-world spread and its source.

**Done when.** A second session runs the press staff cash test on its pinned seed in Roslyn Heights, New York and on ten fresh drawn places in a test world and sees every run pass. The PR names the record id of the outlet head's opening cash and the writer of it by file and line.

**Waits on.** Nothing.

**Files.** src/core2/press-staff-cash.test.ts, src/core2/modules/press.ts, src/core2/official-living.ts

**Notes.** lead: red-main. Found by the elections wire session while running the petition line's tests; it fails identically on clean main, so it is not the petition branch's.

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/press-staff-cash.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=cbde9425c9b39c9028eb1b3abe5ce48509818e965fd5d5e38b0673d16bb83741: 1 of 1 passed. Fresh draw GOLDEN_PATH_SEED=sweep-fresh-<random> (number not kept): 1 of 1 passed. Green on both. Proposed for the CTO: drop as fixed on main.

Cause finder (Nov 11, 2026, for Fable B): one more run with the pinned seed on main 8c980a59 passed. Proposed: close.

Dropped Nov 13, 2026 (Account lead T43, CTO's ruling on #8928 comment 6865473498, checked against the code on the train, draft PR #9052, eb349e5d76): its own Fix says nothing is left to build. Code check: `npx vitest run src/core2/press-staff-cash.test.ts` passes on the train (1 of 1, in a run with the business and consumer-credit tests).
