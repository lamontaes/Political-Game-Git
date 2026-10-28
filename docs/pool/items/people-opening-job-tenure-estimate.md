---
id: people-opening-job-tenure-estimate
title: "Opening jobs start on the game's first day, so tenure within a firm spans days and how people work decides every layoff"
area: people
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/traits-opening-job-tenure
pr: #6043
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T07:51:50.884Z
---

**What.** The opening records no start date for anyone's job: src/core2/deep-past.ts:599 keeps tenure only from a supplied start, so every worker's tenure counts from the game's first day. Measured Oct 24 by the traits lead, tenure within a firm spans about five days after one to three months of play in three drawn places (Puapua, American Samoa; Melville, Rhode Island; Middleborough Center, Massachusetts). Tenure is a reason in who an employer lets go (src/core2/modules/jobs.ts, layOff) and in who quits, so how a person works decided all 121 layoffs in six months in Oak Grove, Oregon. Estimate, never UNKNOWN: start each opening job's tenure from the real distribution by age (BLS Employee Tenure, median 3.9 years, jobsTypicalTenureYears), drawn per world and marked as an estimate with its source.

**Rules.** Estimate, never UNKNOWN: the start date is an estimate from the BLS distribution with a per-world spread, marked with its source. No dice: who exists and when they started may be drawn at generation; no later decision is a roll. One model, two tiers: counted workers carry the same tenure estimate as full ones.

**Done when.** In one year of buildBenchWorld in a place drawn from all 56, seed named, tenure within firms at the start spreads like the BLS distribution (median within a factor of 1.5 of 3.9 years), and the played year has layoff records decided by tenure and others decided by how the worker works (the workDecided value on the job-change record), both named by record id. **On screen.** Nothing yet: it would show on Jobs and study, and News, and nothing there reads it.

**Files.** src/core2/deep-past.ts, src/core2/modules/jobs.ts, src/core2/data/jobs/parameters.json

**Notes.** Filed Oct 24 by the traits lead while sizing traitWeightJobsValueWorker (traits-outcome-job-performance), which is sized against real tenure for this reason.

Sent back 2026-10-26 from PR #6043 (branch claude/traits-opening-job-tenure): Declared pay-growth parent #6010 remains open and unmerged; the body says the diff still carries that stack, so land its parent first or isolate the opening-tenure change on main.; finish on that branch, merge main into it first.
