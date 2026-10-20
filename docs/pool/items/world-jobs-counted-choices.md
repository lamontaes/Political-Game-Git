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
blocked-on:
source: added with npm run pool -- add
claimed-at:
after: world-jobs-counted-chooser,world-counted-chooser-business-credit
---

**What.** This is the roll-up for retiring SG-WORLD-jobs-counted-choices: counted workers retire, quit and look for work by summed pulls (`strongestPulls` in jobs.ts) instead of the shared chooser. The design blocker (an aggregate chooser for counted groups) is answered here: score the same offers a full person gets with the shared scoring terms per counted group, times its count, with a carried remainder. It was split Oct 20 into world-jobs-counted-chooser (the chooser and the jobs engine's four counted reviews) and world-counted-chooser-business-credit (the business and credit callers). Nothing is built under this id.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person times its count. No dice: shares follow scored offers and a carried remainder. Replace, never layer: the summed-pull helper is deleted when both parts land and the stopgap row is marked resolved.

**Done when.** Both parts are done: in a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose) counted retirements, quits, looking, closings, foundings and borrowing all come from the aggregate chooser with recorded group reasons by record id, and src/core2/jobs.test.ts passes with no strongestPulls left in src.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/business.ts, src/core2/modules/credit.ts

**Notes.**

Oct 20 (pool feeder): spec written; the chooser design call is made in the report: score the shared offer list per counted group (mean needs and traits) and act by selection weight times count, which follows one model two tiers. reviewCountedRetirements, Quits, Looking and Entry already exist; only their scoring changes.
