---
id: world-jobs-counted-choices
title: "Counted workers retire quit and look for work through the shared chooser"
area: world
kind: stopgap
priority: 2
size: M
status: blocked
claimed-by:
pr:
blocked-on: design: an aggregate chooser for counted groups (counted pulls already use the full person's reasons)
source: added with npm run pool -- add
claimed-at:
---

**What.** Counted workers' retirement, quitting and job-search decisions must use the same rule as a full person's decisions with the same traits and money. Apply the shared chooser to a counted group and multiply by its count, or fill a counted person in when they meet an employer. Replace the stand-in apportionment rather than adding a second competing rule.

**Rules.** One model, two tiers: counted people and full people are read by the same rule, times their count. No dice: hires, layoffs and retirements come from books, fit, need and the law in force, never a monthly chance. Replace, never layer: the fake is deleted in the same change and the row SG-WORLD-jobs-counted-choices is cleared in src/core2/data/stopgaps.json, never closed by deleting it alone.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56 and a seed the builder did not choose, both named in the PR body) the mechanic above appears by job, decision or claim record id, a test in src/core2/jobs.test.ts shows it, the stopgap tripwire test shows SG-WORLD-jobs-counted-choices resolved, and the PR body names one affected person by record id.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps.json, src/core2/jobs.test.ts

**Notes.** Split from world-stopgap-jobs-faked-mechanic (an L item) on Oct 19; row SG-WORLD-jobs-counted-choices.

Claude, Oct 19: counted retire, quit and look already score with the same reasons and trait lean as a full person (jobs.ts countedSeekers and strongestPulls apportion by the summed pull). What is left is a design call: whether that apportionment counts as the 'aggregate chooser' the stopgap names, or counted workers must run the per-person chooser. Needs the CTO's ruling before building; the retire path no longer uses the place average (PR #5224).
