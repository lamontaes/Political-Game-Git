---
id: tests-legislature-test-over-time-limit
title: "legislature.test.ts: the budget-without-an-executive test runs 122 s against a 120 s limit, and the minimum-wage golden-path test failed once in a full run"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr: #5374
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Running src/core2 test files on clean main on Oct 20, `src/core2/legislature.test.ts` failed twice in two different ways that did not reproduce alone. In a 92-file run, the golden-path test "an ordinance raising the minimum wage passes or fails on members' reasons" failed at the check that every member who did not abstain has a recorded vote reason for the bill (line 245); it passed six times by itself and once in a full-file run. In that full-file run, "a budget without an executive carries department lines without doubling funding" ran 122 seconds against the file's 120 second limit and failed. Find whether the first is a missing vote reason on some draw (an Ask why defect) or load, and cut the second test's time or give it a deliberate limit with a reason.

**Rules.** Ask why: every non-abstaining member's vote on a bill has a recorded reason, by record id. Speed: nothing in a played year scans the world each day; a test over the limit points at a slow path, not a bigger timeout.

**Done when.** In the played world (buildBenchWorld) over 10 runs of src/core2/legislature.test.ts on random draws, every non-abstaining member of the minimum-wage ordinance vote has a vote reason by record id, and the budget test finishes under its limit with the time before and after reported; or the failures are shown to be load, with the evidence.

**Files.** src/core2/legislature.test.ts, src/core2/modules/legislature.ts

**Notes.** The minimum-wage failure had no seed in its message: add the place and seed to that expect so the next failure names its draw.
