---
id: release-red-housing-calibration
title: "housing-calibration test: a share of 0.25 against a lower bound of 0.672 at line 81 (the town's count near its state's HUD rate)"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5324
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The housing calibration can judge an eviction-burden curve from only a handful of court cases, producing an unstable result. Requiring ten cases must not silently skip every burden assertion in a small town. Draw a bounded number of additional places and pool their recorded court cases until the curve has a meaningful sample, failing with the replay seed and places when that sample cannot be reached.

**Rules.** Wire to the world: the calibration reads actual court cases from generated played worlds. No dice: the measurement checks aggregate behavior and does not pick an actor's outcome. Preserve the existing burden bounds and HUD comparison rather than clearing a red check by skipping its assertions.

**Done when.** The test in src/core2/housing-calibration.test.ts pools at least ten recorded cases from no more than four drawn places, fails with the seed and attempted places on exhaustion, and executes all three burden-curve assertions unconditionally after that positive sample check. Its log names every place and replay seed. The HUD comparison is retained; any claimed main-only failure is replayed on clean main and recorded separately.

**Files.** src/core2/housing-calibration.test.ts

**Notes.** Sent back 2026-10-23 from PR #5324 (branch claude/release-red-housing): the PR body lacks the mandatory Done-when evidence table and still says the failure was not reproduced; put the bounded ten-case proof, replay seed and main-only HUD result in the body and replace the item TODO acceptance; finish on that branch, merge main into it first.

Found by running src/core2 on main, Oct 19 (release-suite-red-list-on-main): 'expected 0.25 to be greater than or equal to 0.6723044397463002' at housing-calibration.test.ts:81. The place and seed were not printed; print them first.
