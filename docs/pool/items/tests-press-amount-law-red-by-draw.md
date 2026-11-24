---
id: tests-press-amount-law-red-by-draw
title: "The amount-law press test is red by draw: no story of Ohio's minimum wage ending is printed"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
source: "Interview check thread, Nov 15, 2026, gating the outlet-of-record change on train 53e4b29f"
root: none
---

**What.** `src/core2/press-amount-law.test.ts`, "prints the end of Ohio's state minimum wage", fails with "wage stories printed: expected 0 to be greater than 0". It failed on the clean train 53e4b29f and on the outlet-of-record branch at different drawn places, so it turns a gate red by draw. Seen: a builder's or the train's gate goes red on a test nobody's change touched.

**Cause.** Measured: Aberdeen, Ohio (3900142), seed a3cff298015953a6, on the outlet-of-record branch; Aberdeen, Ohio, seed 8c77473674f610c3, on the clean train.

**Fix.** Read why each drawn place above fails (a case the place cannot reach, or a real defect). Then pin the test to named places and fixed seeds in the test file where the case is reachable, with the passed-over places named, per the pinned-tests skill. If a place shows a real defect, file it as its own item.

**Time box.** 2 hours.

**Rules.** No dice: the pinned places are chosen from the record of the case, never by rerunning seeds until one passes.

**Done when.** The test runs at its named places and seeds, passes on the train, and its comment says why each place was chosen. A second session runs it on main twice in a row and sees the same result, then plays the case in a drawn place in the running game and names its seed.

**Waits on.** Nothing.

**Files.** src/core2/press-amount-law.test.ts
