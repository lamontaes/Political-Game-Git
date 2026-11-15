---
id: tests-press-turnover-red-by-draw
title: "The press-turnover test is red by draw: a dead reporter's opening is not found"
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
source: "Interview check thread, Nov 15, 2026, gating the outlet-of-record change on train 53e4b29f"
root: none
---

**What.** `src/core2/press-turnover.test.ts`, "replaces a reporter who died through a jobs hire that reaches the masthead", fails with "an opening for <person>: expected undefined to be defined". It failed on the clean train 53e4b29f and on the outlet-of-record branch at different drawn places, so it turns a gate red by draw. Seen: a builder's or the train's gate goes red on a test nobody's change touched.

**Cause.** Measured: Fence Lake, New Mexico (3526010), seed 9bf53543985773c8be1d77b6fe6178ca19c656dc2f2c1e39163a53541539d37a, on the outlet-of-record branch; Tanapag, Northern Mariana Islands (territory:MP:tanapag), seed 2e968dc37ad2ffae487fb862ec95857e79a0bffd24e052aca4138612ec2e66c7, on the clean train.

**Fix.** Read why each drawn place above fails (a case the place cannot reach, or a real defect). Then pin the test to named places and fixed seeds in the test file where the case is reachable, with the passed-over places named, per the pinned-tests skill. If a place shows a real defect, file it as its own item.

**Time box.** 2 hours.

**Rules.** No dice: the pinned places are chosen from the record of the case, never by rerunning seeds until one passes.

**Done when.** The test runs at its named places and seeds, passes on the train, and its comment says why each place was chosen. A second session runs it on main twice in a row and sees the same result, then plays the case in a drawn place in the running game and names its seed.

**Waits on.** Nothing.

**Files.** src/core2/press-turnover.test.ts
