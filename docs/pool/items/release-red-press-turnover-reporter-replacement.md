---
id: release-red-press-turnover-reporter-replacement
title: "press-turnover test: a press opening filled in 4 places, seed 2dd07ef95278f4ef, finds no reporter replacement (expected 0 to be greater than 0, press-turnover.test.ts:86)"
area: world
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/pool-red-turnover
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:06:30.257Z
---

**What.** The press-turnover test fails in a place with seed 2dd07ef95278f4ef: a press opening filled in 4 places, and then it expects some reporter replacement and finds none (expected 0 to be greater than 0, press-turnover.test.ts:86). Find whether the jobs hire never reaches the newspaper's mast or the opening is never made. A reporter who leaves should be replaced through a hire the paper's staff list shows.

**Rules.** Fix at the root: a red test is fixed in place or the code it guards is, never skipped or loosened. No dice. One rule, all 56 places: place facts come from data, and the test names the place and seed it drew.

**Done when.** In a drawn place (name and seed in the PR body) a reporter who left is replaced through a jobs hire that reaches the paper's mast, by record id, and src/core2/press-turnover.test.ts passes.

**Files.** src/core2/press-turnover.test.ts, src/core2/modules/press.ts, src/core2/press-staff.ts

**Notes.** Found running src/core2 on main, Oct 19 to 20 (release-suite-red-list-on-main). The test took 991 s, so it may also be too slow for the small container.

Checked Oct 20 (claude/political-game-pool-3xfqef-8): `press-turnover.test.ts` passes on current main with `PRESS_TURNOVER_SEED=2dd07ef95278f4ef` (the seed in the title). Main carries 802e5152c0 ("Keep one press opening buffer when outlets enroll as employers"), which touches the path the failure was on, so the likely fix landed after the red run. Not reproduced, nothing built; the CTO can close it as done.
