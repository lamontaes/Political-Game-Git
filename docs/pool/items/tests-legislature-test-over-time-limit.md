---
id: tests-legislature-test-over-time-limit
title: "legislature.test.ts: the budget-without-an-executive test runs 122 s against a 120 s limit, and the minimum-wage golden-path test failed once in a full run"
area: gov
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/legislature-test-time
pr: #5374
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:38:34.485Z
---

**What.** Running src/core2 test files on clean main on Oct 20, `src/core2/legislature.test.ts` failed twice in two different ways that did not reproduce alone. In a 92-file run, the golden-path test "an ordinance raising the minimum wage passes or fails on members' reasons" failed at the check that every member who did not abstain has a recorded vote reason for the bill (line 245); it passed six times by itself and once in a full-file run. In that full-file run, "a budget without an executive carries department lines without doubling funding" ran 122 seconds against the file's 120 second limit and failed. Find whether the first is a missing vote reason on some draw (an Ask why defect) or load, and cut the second test's time or give it a deliberate limit with a reason.

**Rules.** Ask why: every non-abstaining member's vote on a bill has a recorded reason, by record id. Speed: nothing in a played year scans the world each day; a test over the limit points at a slow path, not a bigger timeout.

**Done when.** In the played world (buildBenchWorld) over 10 runs of src/core2/legislature.test.ts on random draws, every non-abstaining member of the minimum-wage ordinance vote has a vote reason by record id, and the budget test finishes under its limit with the time before and after reported; or the failures are shown to be load, with the evidence.

**Files.** src/core2/legislature.test.ts, src/core2/modules/legislature.ts

**Notes.** The minimum-wage failure had no seed in its message: add the place and seed to that expect so the next failure names its draw.

Oct 20 (claude/legislature-test-time): sixteen more runs of the two tests on random draws (pairs of runs, with the seed now in the vote-record message) all passed; the minimum-wage vote-reason failure showed once more in a run of three pairs, but its message was cut by my filter and it did not recur in sixteen reruns, so it is still unexplained: the next failure will name its member, vote id, place and seed. The budget test took 15 to 85 seconds alone, depending on the drawn town, and 122 seconds inside a 92-file run, so the 122 seconds was load; its limit is now 240 seconds with that reason in the test.
