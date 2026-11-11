---
id: world-counted-chooser-business-credit
title: "Counted business closings, foundings and borrowing use the aggregate chooser, and strongestPulls is deleted"
area: world
kind: stopgap
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: world-jobs-counted-choices-one-rule
blocked-on:
milestone:
lead: jobs
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: split from world-jobs-counted-choices by pool feeder Oct 20
checked: fable 2026-11-10
---

**What.** Move the remaining callers of the summed-pull helper onto the shared chooser that counted workers already use. `strongestPulls` in src/core2/modules/jobs.ts is still called by src/core2/modules/business.ts (the counted owners' closing choice near line 808 and the founding choice near line 1982) and by src/core2/modules/credit.ts (counted businesses deciding to borrow near line 696). Give each the same offers a full owner weighs through the chooser, scored per counted group and counted at the group's weight, and delete the exported helper and its stopgap marker from jobs.ts. The ramp share business.ts passes today as a logistic score becomes the offer's own selection weight. Feeds: world-jobs-counted-choices, which waits on it; drop it if the lead drops that item.

**Cause.** Found in code: strongestPulls is defined at src/core2/modules/jobs.ts:3781 (marked SG-WORLD-counted-owner-pulls, still open in src/core2/data/stopgaps/world.json) and still called from src/core2/modules/business.ts (imported at line 62) and src/core2/modules/credit.ts:696. Counted workers already decide through the shared chooser (workerOffers and reviewCountedWorkers in jobs.ts); counted owners do not.

**Fix.** Move business closing, business founding and credit borrowing for counted owners onto the shared chooser (chooseAct in src/core2/choice.ts) per counted group at the group's weight, then delete strongestPulls and mark SG-WORLD-counted-owner-pulls resolved.

**Time box.** 6 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted owner is weighed by the same offers as a full one, times the group's count. No dice: shares come from scored offers and a carried remainder. Replace, never layer: `strongestPulls` and its stopgap marker are deleted and the row is marked resolved in the same change. An effect is a read, not a record: the credit engine reads the borrowers chosen and the business engine reads the closings. Speed: no whole-world scan; groups, not people.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, a drawn place and a seed the builder did not choose, both named in the PR body) and sees counted businesses close, start and borrow through the shared chooser, each as a business or credit record id with its group's reasons, with no call of strongestPulls remaining in src, shown by src/core2/business.test.ts and src/core2/credit.test.ts. On screen: nothing yet; it would show on Politics, Campaigns and the election night results, and nothing there reads it.

**Waits on.** Nothing. Its `after` item (world-jobs-counted-choices-one-rule) was dropped as a duplicate; counted workers' shared chooser is already on main.

**Files.** src/core2/modules/business.ts, src/core2/modules/credit.ts, src/core2/modules/jobs.ts, src/core2/data/stopgaps/world.json, src/core2/business.test.ts, src/core2/credit.test.ts

**Notes.** Split from world-jobs-counted-choices Oct 20.
