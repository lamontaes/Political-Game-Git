---
id: world-jobs-counted-choices
title: "Counted workers retire quit and look for work through the shared chooser"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
after: world-jobs-counted-chooser,world-counted-chooser-business-credit
---

**What.** Counted workers' retirement, quitting and job-search decisions must use the same rule as a full person's decisions with the same traits and money. Apply the shared chooser to a counted group and multiply by its count, or fill a counted person in when they meet an employer. Replace the stand-in apportionment rather than adding a second competing rule.

**Rules.** One model, two tiers: counted people and full people are read by the same rule, times their count. No dice: hires, layoffs and retirements come from books, fit, need and the law in force, never a monthly chance. Replace, never layer: the fake is deleted in the same change and the row SG-WORLD-jobs-counted-choices is cleared in src/core2/data/stopgaps.json, never closed by deleting it alone.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56 and a seed the builder did not choose, both named in the PR body) the mechanic above appears by job, decision or claim record id, a test in src/core2/jobs.test.ts shows it, the stopgap tripwire test shows SG-WORLD-jobs-counted-choices resolved, and the PR body names one affected person by record id.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps.json, src/core2/jobs.test.ts

**Notes.** Oct 20 (pool feeder): spec written; the chooser design call is made in the report: score the shared offer list per counted group (mean needs and traits) and act by selection weight times count, which follows one model two tiers. reviewCountedRetirements, Quits, Looking and Entry already exist; only their scoring changes.

Split from world-stopgap-jobs-faked-mechanic (an L item) on Oct 19; row SG-WORLD-jobs-counted-choices.

Claude, Oct 19: counted retire, quit and look already score with the same reasons and trait lean as a full person (jobs.ts countedSeekers and strongestPulls apportion by the summed pull). What is left is a design call: whether that apportionment counts as the 'aggregate chooser' the stopgap names, or counted workers must run the per-person chooser. Needs the CTO's ruling before building; the retire path no longer uses the place average (PR #5224).

Sent back 2026-10-24 from PR #5767 (branch claude/counted-job-choices): New counted choices test stops on the first retirement/search and returns before completing the required one-year run; retain witnesses and finish/assert all 365 days; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5767 (branch claude/counted-job-choices): Already-seeking full people are skipped by reviewJobless while counted seekers are re-evaluated and may lose seeker/claim state; resolved counted-choices stopgap still leaves a tier exception; finish on that branch, merge main into it first.
