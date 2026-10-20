---
id: world-counted-chooser-business-credit
title: "Counted business closings, foundings and borrowing use the aggregate chooser, and strongestPulls is deleted"
area: world
kind: stopgap
priority: 2
size: S
status: open
claimed-by:
pr:
after: world-jobs-counted-chooser
blocked-on:
milestone:
source: split from world-jobs-counted-choices by pool feeder Oct 20
---

**What.** Move the remaining callers of the summed-pull helper onto the aggregate chooser built in world-jobs-counted-chooser. `strongestPulls` is still called by `src/core2/modules/business.ts` (the counted owners' closing choice near line 766 and the founding choice near line 1648) and by `src/core2/modules/credit.ts` (counted businesses deciding to borrow near line 502). Give each the same offers a full owner weighs through the chooser, scored per counted group and counted at the group's weight, and delete the exported helper and its stopgap marker from jobs.ts. The ramp share business.ts passes today as a logistic score becomes the offer's own selection weight.

**Rules.** One model, two tiers: a counted owner is weighed by the same offers as a full one, times the group's count. No dice: shares come from scored offers and a carried remainder. Replace, never layer: `strongestPulls` and the SG-WORLD-jobs-counted-choices marker are deleted and the row is marked resolved in the same change. An effect is a read, not a record: the credit engine reads the borrowers chosen and the business engine reads the closings. Speed: no whole-world scan; groups, not people.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) counted businesses close, start and borrow through the aggregate chooser, each as a business or credit record id with its group's reasons, with no call of strongestPulls remaining in src, shown by src/core2/business.test.ts and src/core2/credit.test.ts.

**Files.** src/core2/modules/business.ts, src/core2/modules/credit.ts, src/core2/modules/jobs.ts, src/core2/data/stopgaps.json

**Notes.** Split from world-jobs-counted-choices Oct 20.
