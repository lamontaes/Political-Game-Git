---
id: world-job-ids-end-without-a-change
title: "About 280 full people's jobs get an end date in a year with no job change on record"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In a played year of Westport, South Dakota (place key 4670540, seed 9a630ad552b2eb8df5ea0f88d18e14b075f738848837c96f6be001f87687b710) on main 2ab5bf066d, about 280 work-relationship jobs of full people got an endsAt with no row in the jobs module's changes table (for example work-relationship_e2a47b55e8c8990e ended 2025-03-21). They look like jobs reissued under a new id rather than separations, but nothing records why. A reader counting ended jobs would see false hires and separations.

**Rules.** An effect is a read, not a record: a job that ends must say why where the jobs engine and its readers look. Ask why: every ended job names its reason and who decided.

**Done when.** In a played year of a place drawn from all 56 (place and seed named), every full person's job that ends has a job change on record or is shown to be the same job continuing, and a test fails when a job ends with neither.

**Files.** src/core2/modules/jobs.ts

**Notes.** Found by the M0-M2 lead's M1 helper, Oct 24.
