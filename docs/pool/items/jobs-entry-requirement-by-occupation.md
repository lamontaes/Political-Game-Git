---
id: jobs-entry-requirement-by-occupation
title: "Each occupation's typical entry requirement (credential, experience) from BLS Employment Projections ranks first-job applicants"
area: world
kind: research
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
after: jobs-no-openings-in-small-towns
lead: jobs
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** When an opening has several applicants the jobs engine picks the one with the best fit: the years of experience in that occupation times a weight, plus the person's reliability times a weight, plus an official's word for them. Every occupation is judged by the same weights, so an entry-level opening with a 22-year-old and a 40-year-old with ten years in the trade ranks the experienced one first and the 22-year-old can never get a first job. Collect, for each occupation the game uses, what the BLS Employment Projections table lists as the work experience usually asked in a related occupation (none, under five years, five years or more) and the typical entry education, cite it, and write it to a data table keyed by occupation classification. A later item makes the fit read the table; this one is data only.

**Cause.** Design: docs/reports/retroactive-look-first-2026-10-27.md (the Oct 27 audit: the fit-rule change for entry-level openings is a simulation call, owner Oct 24 "Simulate it, don't ask") and the dropped twin docs/pool/items/jobs-occupation-entry-experience.md, which reads this table. Found in code: `fit` and `pick` in src/core2/modules/jobs.ts (lines 3200 and 3250) weight `experienceYears` (line 4141) for every occupation alike.

**Fix.** Write a sourced table of experience asked and typical entry education per occupation (BLS Employment Projections) at src/core2/data/jobs/entry-requirements.json (new), each row with source and tag. An occupation not listed takes the nearest listed occupation, named, marked ESTIMATED. Add a test that every position's occupation reads a row.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: each row cites the BLS Employment Projections table and year, SOURCED, with an ESTIMATED row and its spread where the occupation is not listed. One rule, all 56 places: occupations are national classifications, no place is named, and the table is data. No dice: the table only sets what a job asks, never who is hired. Estimate, never UNKNOWN: an occupation with no row starts from the table's all-occupations share and says so.

**Done when.** A second session, not the builder, runs the test in src/core2/jobs.test.ts, which draws a place from all 56, names it and the seed, builds the played world (`buildBenchWorld`) and shows every position's occupation reads back a row from src/core2/data/jobs/entry-requirements.json with experience asked, typical entry education, source and tag. Nothing on screen reads the table yet.

**Waits on.** Nothing (jobs-no-openings-in-small-towns is done).

**Files.** src/core2/data/jobs/entry-requirements.json (new), src/core2/modules/jobs.ts, src/core2/jobs.test.ts

**Notes.** Written Oct 20 (claude/entry-spec) from the code. `experienceYears` (jobs.ts about line 2271) sums a person's commitments in the occupation; the counted tier keeps its own `countedExperience`. The follow-up is `jobs-occupation-entry-experience`. Waits on `jobs-no-openings-in-small-towns` per its `after:`.

Oct 25 audit: unblocked; the spec was written Oct 20, so the empty-shell block no longer holds.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have added a BLS table of the experience each occupation asks, so entry-level applicants rank differently; no player sees the table, and a single weight stays an estimate.
