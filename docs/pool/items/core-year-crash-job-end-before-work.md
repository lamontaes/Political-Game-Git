---
id: core-year-crash-job-end-before-work
title: 'A played year stops: "A job ends before its day''s work, from calendar work" (Northchase, North Carolina)'
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: claude/year-crash-job-end
pr:
blocked-on:
source: "words-needs-words-60 triage, Oct 16"
claimed-at: 2026-10-16T09:21:09.423Z
---

**What.** `src/core2/job-lifecycle.ts:91` throws "A job ends before its day's work, from calendar work." in Northchase, North Carolina (`drawPlace("batch-9:3", "dialogue-report")`, two-level bench world, 365 days from 2026-10-12). The world cannot finish its year. Find the job that ends on a calendar day before that day's work is recorded, by record id, and order the two correctly.

**Rules.** One rule, all 56 places: the fix reads data for every place, and the repro place is only a repro. Speed: a town's game year stays under two minutes. Ask why: the failing record is named in the fix.

**Done when.** In the repro place and a second drawn place (names and seeds in the PR body) a one-year run of the played world (buildBenchWorld) finishes with no throw, shown by the final date, and the jobs and work tests pass. Reproduce first: run the repro on current main; if it no longer throws, close the item with the run's place and seed.

**Files.** src/core2/job-lifecycle.ts, src/core2/modules/jobs.ts, src/core2/modules/work.ts

**Notes.** From the Words session's notes (Oct 14).

Checked 2026-10-16 (claude session) on current main: does not reproduce. Northchase, North Carolina (`drawPlace("batch-9:3", "dialogue-report")`, place 3747485) and La Plena, Puerto Rico (`drawPlace("rand-job-end-1", "job-end")`, place 7242197) each run a full 365-day year in a two-level bench world from the game's start (2025-01-20) to 2026-01-20 with no throw. The report ran from 2026-10-12, the old start date; the game now starts January 20, 2025, so the year's calendar differs. A different job-end crash does appear on main: "Only a current recorded job can end" at 2025-10-01 in place 0210150 with `drawPlace("probe-1", "health")` (jobs.ts calendar work), which is `jobs-layoff-counted-job-of-full-person` (PR #4541). Closing this one with those runs; reopen with a seed and start date if it returns.
