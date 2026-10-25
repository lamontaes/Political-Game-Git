---
id: jobs-layoff-worked-today
title: "A layoff picks a worker who already worked today and stops the game"
area: world
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/quirky-ride-vrwwz4-layoff-worked-today
pr: #6018
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T09:09:20.173Z
---

**What.** On main 8a26851ba9 the accepted M0-03 command (src/bench/m0-check.ts M0-03) stops in Medicine Lake, Montana (seed f1581305148c217d80a6ee5f927e879713d25c27409cce441aa7c94ed61c5d95) with 'A job ends before its day's work, from calendar work' (src/core2/job-lifecycle.ts:129), thrown by endJob from layOff in src/core2/modules/jobs.ts, called by reviewEmployers in the jobs calendar. The player plays their own day before calendar work runs, so a worker with a shift recorded today can be chosen and their job ended after it was worked. The same case was fixed for office jobs (core-office-job-ends-before-days-work, src/core2/modules/office-day.ts): such a job waits for the next review. Golden-path is red by draw on unrelated PRs (#5972).

**Rules.** No dice: who goes is still the business's choice by tenure and reliability, among the workers it can let go today. Wire to the world: the review that skips a worker today lays someone off by the same rule; nothing is forgiven, only ordered.

**Done when.** The M0-03 command passes in Medicine Lake, Montana with the seed above and in two places drawn from all 56, named with seeds; a test lays off staff whose only candidate worked today, shows no job ended today and the layoff made at the next review, and fails with the old choice.

**Files.** src/core2/modules/jobs.ts

**Notes.** TODO
