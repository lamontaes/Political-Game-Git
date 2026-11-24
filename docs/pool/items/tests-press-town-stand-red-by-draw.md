---
id: tests-press-town-stand-red-by-draw
title: "The press town-stand test is red by draw: a filled-in resident's lean moves the town stand by a few millionths"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: people
model: sonnet
effort: medium
source: "Interview check thread, Nov 15, 2026, gating the outlet-of-record change on train c43bf7e0"
root: none
---

**What.** `src/core2/press-town-stand.test.ts`, "counted residents move where the town stands by the people they stand for, and one filled in keeps their lean", fails with "expected 0.5897098325042632 to be 0.5897146654378804". The test draws its place from a fresh seed each run, so it turns a gate red only on some draws. Seen: a builder's or the train's gate goes red on a test nobody's change touched.

**Cause.** Measured: Centerville, Washington (5311090), PRESS_STAND_SEED a1c021ad293f4267, draw 0, seed a1c021ad293f4267:0: red at the same seed on both the clean train c43bf7e0 and the outlet-of-record branch.

**Fix.** Read why each drawn place above fails (a case the place cannot reach, or a real defect). Then pin the test to named places and fixed seeds in the test file where the case is reachable, with the passed-over places named, per the pinned-tests skill. If a place shows a real defect, file it as its own item.

**Time box.** 2 hours.

**Rules.** No dice: the pinned places are chosen from the record of the case, never by rerunning seeds until one passes.

**Done when.** The test runs at its named places and seeds, passes on the train, and its comment says why each place was chosen. A second session runs it on main twice in a row and sees the same result, then plays the case in a drawn place in the running game and names its seed.

**Waits on.** Nothing.

**Files.** src/core2/press-town-stand.test.ts
