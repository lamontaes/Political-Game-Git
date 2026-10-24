---
id: core-counted-household-jobs-in-step
title: "A counted household's jobs and pay stay at the opening's after hires, raises, layoffs and closures, and fill-in drops a job hired in the year"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/counted-household-jobs-in-step
pr: #5933
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T08:18:33.607Z
---

**What.** The jobs engine ends, starts and re-rates counted jobs in the residents runtime's job rows and wage flows, but the counted household's own jobs list, its yearly wages and each member's job id keep the opening's values. Every reader of a counted household's income (the school engine's income fifth, crime exposure, coverage) reads pay the household no longer earns, and a counted worker hired during the year loses that job when the player meets them, since fill-in hands over the household's own jobs list. In Snow Lake Shores, Mississippi (seed 99129b78328b41a6) a household counted at 107,299 dollars a year was filled in at 20,393.

**Rules.** One model, two tiers: a counted household reads the same jobs and pay its full counterpart would. Generated-world proof: a played year in a drawn place shows the counted books and the households agree, by record id. A filled-in person matches what the records already say.

**Done when.** In a one-year buildBenchWorld run in a place drawn from all 56 (place and seed named), every counted household's yearly wages equal its members' open jobs on the employers' books, and a counted worker hired during the year holds that job, at that pay, when filled in; src/core2/counted-household-jobs.test.ts proves it and fails without the fix.

**Files.** src/core2/modules/residents.ts, src/core2/residents-economy.ts, src/core2/modules/jobs.ts, src/core2/counted-household-jobs.test.ts

**Notes.** Found Oct 24 by the effects lead: #5609's fill-in income-fifth regression failed on seed 99129b78328b41a6 for this cause.
