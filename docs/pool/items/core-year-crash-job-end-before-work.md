---
id: core-year-crash-job-end-before-work
title: 'A played year stops: "A job ends before its day''s work, from calendar work" (Northchase, North Carolina)'
area: core
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/year-crash-job-end
pr: #4664
blocked-on:
source: "words-needs-words-60 triage, Oct 16"
claimed-at: 2026-10-16T09:21:09.423Z
---

**What.** `src/core2/job-lifecycle.ts:91` throws "A job ends before its day's work, from calendar work." in Northchase, North Carolina (`drawPlace("batch-9:3", "dialogue-report")`, two-level bench world, 365 days from 2026-10-12). The world cannot finish its year. Find the job that ends on a calendar day before that day's work is recorded, by record id, and order the two correctly.

**Rules.** One rule, all 56 places: the fix reads data for every place, and the repro place is only a repro. Speed: a town's game year stays under two minutes. Ask why: the failing record is named in the fix.

**Done when.** In the repro place and a second drawn place (names and seeds in the PR body) a one-year run of the played world (buildBenchWorld) finishes with no throw, shown by the final date, and the jobs and work tests pass. Reproduce first: run the repro on current main; if it no longer throws, close the item with the run's place and seed.

**Files.** src/core2/job-lifecycle.ts, src/core2/modules/jobs.ts, src/core2/modules/work.ts

**Notes.** From the Words session's notes (Oct 14).
