---
id: tests-press-staff-out-of-town-pay-red-by-draw
title: "The press-staff test is red by draw: an out-of-town press person has no pay record"
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
source: "Interview check thread, Nov 15, 2026, gating the outlet-of-record change on train 7a48e0b3"
root: none
---

**What.** `src/core2/press-staff.test.ts`, "out-of-town press people live on a household cost and are paid each month through a played year", fails with "<person>: no pay record: expected undefined to be truthy". It failed on the clean train 7a48e0b3 and on the outlet-of-record branch at the same seed, so it turns a gate red by draw. Seen: a builder's or the train's gate goes red on a test nobody's change touched.

**Cause.** Measured: Inez, Kentucky (2139430), seed 4b15c3f3df0ce524 (GOLDEN_PATH_SEED), draw 0, world seed b64fc5ebbfe74d56d018efbc64b37ccdc89c16fc3e07c2d1ca6517aaad601808, person_5d46a3f2a508041e has no pay record, on both the clean train 7a48e0b3 and the outlet-of-record branch.

**Fix.** Read why each drawn place above fails (a case the place cannot reach, or a real defect). Then pin the test to named places and fixed seeds in the test file where the case is reachable, with the passed-over places named, per the pinned-tests skill. If a place shows a real defect, file it as its own item.

**Time box.** 2 hours.

**Rules.** No dice: the pinned places are chosen from the record of the case, never by rerunning seeds until one passes.

**Done when.** The test runs at its named places and seeds, passes on the train, and its comment says why each place was chosen. A second session runs it on main twice in a row and sees the same result, then plays the case in a drawn place in the running game and names its seed.

**Waits on.** Nothing.

**Files.** src/core2/press-staff.test.ts
