---
id: traits-outcome-job-performance
title: "An employer's view of a worker reads the worker's conscientiousness at the study's size, through the decision table"
area: people
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr: #5901
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** An ordinary worker's performance shapes two employer choices today, whom to hire and whom to lay off first (src/core2/modules/jobs.ts, the applicant fit and layOff's keep score), but both read one raw trait (reliability) at a weight nobody sized (jobsFitReliabilityWeight 0.5, TUNABLE), outside data/content/trait-decisions.json. Give the employer's valuation a decision row whose options carry act kinds, read the worker's lean through the shared helper, and size the weight from Barrick and Mount 1991 (conscientiousness and job performance, rho 0.22, 2.44 between the thirds), so the trait-shaped outcome outcome.job-performance is read by its owning engine. Counted workers must be valued by the same rule, times their count.

**Rules.** No dice: whom an employer keeps follows tenure and the worker's recorded temperament, never a roll. One model, two tiers: counted workers are valued by the same rule as full ones. Research before building: the weight cites its study.

**Done when.** In one year of buildBenchWorld in two places drawn from all 56, seeds named, scripts/traits/trait-wiring-matrix.ts shows the new decision running with its calibrated weight, a layoff job-change record id where the worker let go leaned least toward keeping, and data/content/trait-outcomes.json grades outcome.job-performance as read with that record and the engine line.

**Files.** src/core2/modules/jobs.ts, data/content/trait-decisions.json, data/content/trait-outcomes.json, src/core2/data/jobs/parameters.json

**Notes.** Split Oct 24 by the traits lead from traits-outcomes-unread.
