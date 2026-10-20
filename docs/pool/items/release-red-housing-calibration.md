---
id: release-red-housing-calibration
title: "housing-calibration test: a share of 0.25 against a lower bound of 0.672 at line 81 (the town's count near its state's HUD rate)"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/release-red-housing
pr: #5324
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:59:25.221Z
---

**What.** The housing-calibration test fails at line 81 with a value of 0.25 against a lower bound of 0.6723: the town's count should sit near its state's HUD rate, and it does not. Find whether the opening's housing mix or the calibration bound is wrong, and fix the one that is, so the count follows the state's rate. The town's housing then follows its state's rate.

**Rules.** Fix at the root: a red test is fixed in place or the code it guards is, never skipped or loosened. No dice. One rule, all 56 places: the place facts come from data, and the test names the place and seed it drew.

**Done when.** In a drawn place (name and seed in the PR body) the town's count sits within the test's bound of its state's HUD rate and src/core2/housing-calibration.test.ts passes.

**Files.** src/core2/housing-calibration.test.ts, src/core2/modules/housing.ts

**Notes.** Found by running src/core2 on main, Oct 19 (release-suite-red-list-on-main): 'expected 0.25 to be greater than or equal to 0.6723044397463002' at housing-calibration.test.ts:81. The place and seed were not printed; print them first.
