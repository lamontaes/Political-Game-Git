---
id: world-employer-plan-share-far-below-source
title: "Employer health plans reach 3 to 5 percent of residents, against the 53.7 percent the engine cites"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The vital-statistics reader (scripts/dev-tests/vitals.ts, PR 7595) counts residents holding a recorded employer plan: each full person's coverage record plus each counted household's covered people times the households it stands for. In Futiga, American Samoa (seed from draw dpA) it reads 5.2, 3.3 and 4.2 percent at the start and after one and two years; in Willow Creek, California (draw dpC) 3.6 and 2.8 percent. The coverage module's own source note (coverage.ts sourceFor) cites Census P60-284: employment-based coverage is 53.7 percent of the population. Either the counted rows (countedCoverage) cover far fewer people than the employers' plans reach, or the reader misreads what covered means; check both before changing the engine. The module records only employer and Medicare plans, so no figure here is an uninsured rate.

**Rules.** No dice. Find the cause by file and line: how many counted households hold a countedCoverage row against how many hold a job with an employer plan, and what the covered field counts. Real ranges are not targets (owner, Nov 8): fail only when nothing in the world explains the value.

**Done when.** The cause is named by file and line; the share of residents on an employer plan is explained by the world (employment, employer size and pay) or fixed, in two random places that name their seed; the vital-statistics reader reports it. Checked in a played world (buildBenchWorld, a seed the builder did not choose) by record id, with the changed test passing and the result named.

**Files.** src/core2/modules/coverage.ts, scripts/dev-tests/vitals.ts

**Notes.** Found by the Dev Tester, Nov 8 night.
