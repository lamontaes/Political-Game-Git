---
id: world-housing-pipeline-no-moves-seed
title: "housing-pipeline.test.ts: no household moves into a finished building in a played year (HOUSING_PIPELINE_SEED=e00b7ecaafb068a5, red on main)"
area: world
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/housing-pipeline-seed
pr: #4864
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T02:24:01.791Z
---

**What.** `src/core2/housing-pipeline.test.ts` ("starts buildings before the opening and moves households into the ones that finish") fails on main with `HOUSING_PIPELINE_SEED=e00b7ecaafb068a5`: an assertion that something is greater than zero gets zero (the test counts the moves into finished buildings). Run it with that seed to see which place it draws and which count is zero, then decide whether that place has no building that finishes in the year (the test should draw on until one does, naming every place tried) or the moving engine misses households it should move.

**Rules.** No dice. One rule, all 56 places: the place and seed are named on a failure.

**Done when.** The test passes on seed e00b7ecaafb068a5 and two other seeds, and a failure names every place tried.

**Files.** src/core2/housing-pipeline.test.ts, src/core2/housing-occupancy.ts

**Notes.** Found Oct 17 running the housing tests for core-fill-in-hook (PR in its item file); the same seed fails on a clean main.
