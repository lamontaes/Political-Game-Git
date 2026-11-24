---
id: world-job-ids-end-without-a-change
title: "About 280 full people's jobs get an end date in a year with no job change on record"
area: world
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: high
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** In a played year of Westport, South Dakota (place key 4670540, seed 9a630ad552b2eb8df5ea0f88d18e14b075f738848837c96f6be001f87687b710) on main 2ab5bf066d, about 280 work-relationship jobs of full people got an endsAt with no row in the jobs module's changes table (for example work-relationship_e2a47b55e8c8990e ended 2025-03-21). They look like jobs reissued under a new id rather than separations, but nothing records why. A reader counting ended jobs would see false hires and separations.

**Cause.** Needs cause. Looked at: Westport, South Dakota (place key 4670540, seed 9a630ad552b2eb8df5ea0f88d18e14b075f738848837c96f6be001f87687b710), a played year in buildBenchWorld: about 280 full people's jobs get an endsAt with no row in the jobs changes table (for example work-relationship_e2a47b55e8c8990e ended 2025-03-21). The writers of endsAt are in src/core2/modules/jobs.ts.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: a job that ends must say why where the jobs engine and its readers look. Ask why: every ended job names its reason and who decided.

**Done when.** A second session, on main in Westport, South Dakota with the seed above and in a place drawn from all 56 (place and seed named), plays a year and finds that every full person's job that ends has a job change on record or is the same job continuing under one id, by record id. A test fails when a job ends with neither.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts

**Notes.** Found by the M0-M2 lead's M1 helper, Oct 24.

**Notes (Fable's check, Nov 10).** How to find the cause: in the Westport, South Dakota replay, wrap the write of `endsAt` on a full person's job and print the caller for each end that has no row in the jobs changes table. The suspect is a job reissued under a new id. The fix then records the change with its reason and decider, or keeps the same job id.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have written a reason on a reissued job id; a bookkeeping gap no player sees (the visible hires and layoffs are on world-job-turnover-far-below-jolts).
