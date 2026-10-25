---
id: world-jobs-counted-chooser
title: "Counted workers retire, quit and look for work through one aggregate chooser that scores the same offers as a full person"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
milestone:
source: split from world-jobs-counted-choices by pool feeder Oct 20
---

**What.** Replace `strongestPulls` in `src/core2/modules/jobs.ts` as the way counted workers decide. Today `reviewCountedRetirements`, `reviewCountedQuits`, `reviewCountedLooking` and `reviewCountedEntry` give each counted worker a hand-built score (baseline plus pay gap plus unemployment plus trait lean) and let the strongest summed logistic pulls act, while a full worker passes the same offers (`stay`, `look`, `leave`, retire) through `chooseAct`. Build an aggregate chooser: for each counted group (place, role, age band, pay-gap band) build the same offer list the full worker gets, score it with the shared `scoreOffers` terms using the group's mean needs and traits, and let as many of the group act as the offers' selection weights times the group's count add up to, the remainder carried to next month, the members who act being the ones whose own trait lean is strongest, ties by id. The jobs engine's counted reviews call it, and `strongestPulls` is deleted from jobs.ts.

**Rules.** One model, two tiers: a counted group is read with the same offers and reasons as a full person, times its count; a counted worker who is filled in made the same choice a full one would. No dice: the shares come from scored offers and the carried remainder, with no random draw. Replace, never layer: the four hand-built score functions and `strongestPulls` in jobs.ts are deleted in the same change, and SG-WORLD-jobs-counted-choices is narrowed to the business and credit callers. Speed: the chooser runs per group, not per person; a year must not run more than 20 percent slower than its base. Ask why: a counted quit or retirement keeps its group's recorded reasons by job-change record id.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) counted retirements, quits and starts of looking appear as job-change records with the group's recorded reasons, the totals per group match the old summed-pull totals within the carried remainder before the old code is deleted, and a full worker and a counted worker with the same record score identically. Proved by src/core2/jobs.test.ts and src/core2/jobs-layoff-counted.test.ts.

**Files.** src/core2/modules/jobs.ts, src/core2/choice.ts, src/core2/jobs.test.ts

**Notes.** Split from world-jobs-counted-choices Oct 20. The business and credit modules also call strongestPulls (business-close, found, business-borrow); that is the next part.
