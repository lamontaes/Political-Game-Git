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

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Checked Oct 20 (claude/political-game-pool-3xfqef-8): `press-turnover.test.ts` passes on current main with `PRESS_TURNOVER_SEED=2dd07ef95278f4ef` (the seed in the title). Main carries 802e5152c0 ("Keep one press opening buffer when outlets enroll as employers"), which touches the path the failure was on, so the likely fix landed after the red run. Not reproduced, nothing built; the CTO can close it as done.
