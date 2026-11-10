---
id: world-employer-plan-share-far-below-source
title: "Employer health plans reach 3 to 5 percent of residents, against the 53.7 percent the engine cites"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws-effects
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The vital-statistics reader (scripts/dev-tests/vitals.ts) counts residents holding a recorded employer plan: each full person's coverage record plus each counted household's covered people times the households it stands for. In Futiga, American Samoa (seed from draw dpA) it reads 5.2, 3.3 and 4.2 percent at the start and after one and two years; in Willow Creek, California (draw dpC) 3.6 and 2.8 percent. The coverage module's own source note (sourceFor in src/core2/modules/coverage.ts) cites Census P60-284: employment-based coverage is 53.7 percent of the population. Either the counted rows (countedCoverage) cover far fewer people than the employers' plans reach, or the reader misreads what covered means; check both before changing the engine. The module records only employer and Medicare plans, so no figure here is an uninsured rate.

**Cause.** Needs cause. Measured by the Dev Tester (item): Futiga, American Samoa (draw dpA) 5.2/3.3/4.2 percent and Willow Creek, California (draw dpC) 3.6/2.8 percent via scripts/dev-tests/vitals.ts. Looked at the countedCoverage table (src/core2/modules/coverage.ts line 381) and countedCoverageOf (line 386); whether the counted rows are too few or the reader misreads "covered" is not found.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice. Find the cause by file and line: how many counted households hold a countedCoverage row against how many hold a job with an employer plan, and what the covered field counts. Real ranges are not targets (owner, Nov 8): fix only when nothing in the world explains the value.

**Done when.** A second session (not the builder) plays a world in two drawn places that name their seed, and reads the cause written into this item by file and line; the share of residents on an employer plan is explained by the world (employment, employer size and pay) or fixed, and the vital-statistics reader reports it, with its output quoted by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/coverage.ts, scripts/dev-tests/vitals.ts

**Notes.** Found by the Dev Tester, Nov 8 night.
