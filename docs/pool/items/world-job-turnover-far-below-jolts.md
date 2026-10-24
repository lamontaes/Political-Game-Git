---
id: world-job-turnover-far-below-jolts
title: "M1-04: hires, quits and layoffs on record run 7 to 25 times below the state's JOLTS range in a played year"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-customers-move-between-sellers
source: added with npm run pool -- add
---

**What.** The new M1-04 check (src/core2/tooling/m1-04-check.ts) in Westport, South Dakota (place key 4670540, seed 9a630ad552b2eb8df5ea0f88d18e14b075f738848837c96f6be001f87687b710) measured a year-average 0.463 hires, 0.086 quits and 0.046 layoffs per 100 jobs a month, against the state's JOLTS 5th to 95th percentile ranges of 3.2 to 4.8, 1.5 to 2.6 and 1.1 to 2.0 (data/research/jobs/series/turnover.json). Unemployment averaged 1.12 percent against the state's recorded 1.7 to 8.8. Layoffs wait on customers moving between sellers; hires and quits need their own causes looked at once that lands.

**Rules.** No dice: each hire, quit and layoff comes from the worker's or employer's own situation, and the JOLTS ranges check the totals only. One model, two tiers: counted workers change jobs by the same rules, times their count.

**Done when.** The M1-04 command passes its hires, quits, layoffs and unemployment clauses in Westport, South Dakota (seed above) and two more places drawn from all 56, each named with its rates in the PR body.

**Files.** src/core2/modules/jobs.ts, src/core2/tooling/m1-04-check.ts

**Notes.** Found by the M0-M2 lead's M1 helper, Oct 24. Blocks roadmap M1-04.
