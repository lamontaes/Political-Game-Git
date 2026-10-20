---
id: jobs-entry-requirement-by-occupation
title: "Each occupation's typical entry requirement (credential, experience) from BLS Employment Projections ranks first-job applicants"
area: world
kind: research
priority: 2
size: M
status: blocked
claimed-by:
pr:
blocked-on: spec: the item text is an empty TODO shell; the done-when must be written before it can be built (pool-todo-shells-need-spec)
after: jobs-no-openings-in-small-towns
source: added with npm run pool -- add
---

**What.** When an opening has several applicants the jobs engine picks the one with the best fit (`pick` and `fit` in `src/core2/modules/jobs.ts`, about line 1660): the fit is the years of experience in that occupation times a weight, plus the person's reliability times a weight, plus an official's word for them. Every occupation is judged by the same weights, so an entry-level opening with a 22-year-old and a 40-year-old with ten years in the trade ranks the experienced one first and the 22-year-old can never get a first job. Collect, for each occupation the game uses, what the BLS Employment Projections table lists as the work experience usually asked in a related occupation (none, under five years, five years or more) and the typical entry education, cite it, and write it to a data table keyed by occupation classification, so the next item can make the fit read what the job asks.

**Rules.** Research before building: each row cites the BLS Employment Projections table and year, SOURCED, with an ESTIMATED row and its spread where the occupation is not listed (the nearest listed occupation, named). One rule, all 56 places: occupations are national classifications, no place is named, and the table is data. No dice: the table only sets what a job asks, never who is hired. Estimate, never UNKNOWN: an occupation with no row starts from the table's all-occupations share and says so.

**Done when.** `src/core2/data/jobs/entry-requirements.json` holds a row for every occupation classification the generated world's positions use, each with experience asked, typical entry education, source and tag; a test in `src/core2/jobs.test.ts` draws a place from all 56, names it and the seed, builds the played world (`buildBenchWorld`) and shows every position's occupation reads back a row with a source. The owner plays it: nothing at once; the entry-experience item reads this table.

**Files.** src/core2/data/jobs/entry-requirements.json, src/core2/modules/jobs.ts, src/core2/jobs.test.ts

**Notes.** Written Oct 20 (claude/entry-spec) from the code. `experienceYears` (jobs.ts about line 2271) sums a person's commitments in the occupation; the counted tier keeps its own `countedExperience`. The follow-up is `jobs-occupation-entry-experience`. Waits on `jobs-no-openings-in-small-towns` per its `after:`.
