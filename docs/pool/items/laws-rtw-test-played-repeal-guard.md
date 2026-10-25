---
id: laws-rtw-test-played-repeal-guard
title: "Right-to-work test holds when a played bill repeals the law inside its window"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The right-to-work law test checks union dues over its first 400 days, but in some drawn states a bill the legislature passes in play repeals right-to-work inside that window (Nevada's AB 39, effective 2025-10-01, in one labor-family run). The test then fails on dues the repealed law no longer stops, which is the game working, not a defect. The labor helper saw it fail once and pass on a rerun. The test should check that the law still stands before asserting what it does, the way other law tests do.

**Rules.** One rule, all 56 places: the guard must read the law in force on each day it checks, never name a state or skip a place, so every drawn place still runs the test.

**Done when.** src/core2/right-to-work-law.test.ts reads the right-to-work law in force on the days it checks and asserts its effect only while it stands; when a played bill repeals it inside the window, the test asserts the dues are charged again after the repeal. It passes on the seed that drew the Nevada repeal and on two fresh random seeds, each named in the PR body.

**Files.** src/core2/right-to-work-law.test.ts

**Notes.** TODO
