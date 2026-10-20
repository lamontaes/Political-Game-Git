---
id: tests-housing-laws-year-times-out
title: "housing-laws.test.ts's played-year test times out at 180 seconds in a large drawn town (Woodmore, Maryland), on main too"
area: world
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**What.** `src/core2/housing-laws.test.ts` "reads the law at construction decisions during an ordinary played year" runs 365 days of a drawn town inside a 180-second test timeout. In Woodmore, Maryland (census place 2486710, seed 2eb05ae6613986d30cf1007dd2354402af1571ceaa19c8d41f296fbebbda2e95, pin it with `LAW_LINK_DRAW` pointing at a JSON file of `{seed, key, name, state}`) it times out at 180000 ms on clean main as well as on a branch with a notice change, so the cause is the test's budget against a large town, not a recent change. Either the year takes longer than the timeout allows in a town of this size, which breaks the "a town's game year runs in under two minutes" rule and is a speed bug to find, or the test's timeout is too small.

**Rules.** Speed: a town's game year must run in under two minutes; measure the year alone first (no test harness), one process at a time; never raise a timeout to hide a slow year.

**Done when.** Woodmore, Maryland at that seed runs the played year in under two minutes outside the test and the test passes with its pinned draw, or the measured year is longer and a speed item names what is slow, by function. A drawn place and seed are named in the PR body.

**Files.** src/core2/housing-laws.test.ts, scripts/core2-year/

**Notes.** Found Oct 20 (claude, claude/eviction-settlement-notice) while checking PR #5390; the same test passes in other drawn towns.
