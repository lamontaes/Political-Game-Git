---
id: core-m003-job-ends-before-days-work-greenland
title: "Golden path M0-03 throws 'A job ends before its day's work' on main in Greenland, Arkansas"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/m003-job-ends-greenland
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T05:18:14.856Z
---

**What.** The accepted golden-path spec M0-03 (the day skip that stops at the earliest interrupt, src/bench/m0-check.ts) fails on main at 9528e5e2c4 with GOLDEN_PATH_SEED=f6d4683271130ca439df7dc7c21319bcde607fca7a7f6419e917579c8e7f8e00 and GOLDEN_PATH_PLACE_KEY=0528660 (Greenland, Arkansas). It throws 'A job ends before its day's work, from calendar work.' from src/core2/job-lifecycle.ts:129, reached through player-v1.ts drive. The same error was fixed for office jobs (core-office-job-ends-before-days-work, #4917) and for a year run (core-year-crash-job-end-before-work, #4664), so a new path ends a job on a day its work is still scheduled; CI's golden-path check draws a random seed, so any PR can go red on it, as #6057 did.

**Rules.** One rule, all 56 places: the skip must hold in every place the runner can draw. Ask why: name the job, its end record and the calendar work that still pointed at it, by record id, not a flake.

**Done when.** M0-03 passes on that seed and place on main and on two fresh seeds named in the PR body, with the job, its end and the calendar entry that tripped the throw named by record id, and a test that reproduces the throw before the fix.

**Files.** src/core2/job-lifecycle.ts, src/core2/player-v1.ts, src/bench/m0-check.ts

**Notes.** TODO
