---
id: people-stopgap-residents-faked-mechanic
title: "Stopgaps in residents (faked-mechanic): 1 open"
area: people
kind: stopgap
priority: 2
status: in-pr
claimed-by:
pr: #5076
blocked-on: people-unplaced-fill-in-job
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/residents.ts, kind faked-mechanic"
claimed-at:
---

**What.** A filled-in household keeps its share of the place's unplaced workers' pay (counted workers no employer's books hold) as its own flow, untaxed, until it returns to the counts (SG-CORE-filled-unplaced-income). The opening places only some counted workers in recorded jobs; the rest are paid from one place-level flow with no employer to file a W-2. Place every counted worker in a recorded job on an employer's books so a filled-in worker always gets a real job and withholding. The player would notice that everyone he meets has a boss and a paycheck with tax taken out.

**Rules.** One model, two tiers: a counted worker and a filled-in worker are the same person under the same rule, so the filled-in one matches what the books show (a business with 12 employees gives the clicked person one of the 12); Wire to the world: the placement moves pay and tax between employers, workers and treasuries in a generated world; One rule, all 56 places: no place named; job counts come from place data; Estimate, never UNKNOWN: an unknown employer size starts from the real average marked ESTIMATED; Placeholders: the row closes only when all workers are placed; Replace, never layer: the unplaced-pay flow is deleted; Speed: placement happens at the opening, with no daily scan.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the year's pay shows no unplaced-worker flow, a filled-in worker clicked in the town has an employer, a job and a withholding record that match the business's books (worker, employer and withholding ids named), and the row closes. Tests beside `src/core2/modules/residents.ts` tests. The owner plays it: clicks a stranger and finds an employer with the right headcount.

**Files.** src/core2/modules/residents.ts, src/core2/modules/jobs.ts, src/core2/population.ts, src/core2/data/stopgaps.json

**Notes.** First row: A filled-in household keeps its share of the place's unplaced workers' pay (counted workers no employer's books hold) as its own flow, untaxed, until it returns to the counts.
