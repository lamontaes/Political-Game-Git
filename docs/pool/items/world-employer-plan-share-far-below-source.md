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
model: haiku
effort: low
root: design-one-model-two-tiers
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The vital-statistics reader (scripts/dev-tests/vitals.ts) counts residents holding a recorded employer plan: each full person's coverage record plus each counted household's covered people times the households it stands for. In Futiga, American Samoa (seed from draw dpA) it reads 5.2, 3.3 and 4.2 percent at the start and after one and two years; in Willow Creek, California (draw dpC) 3.6 and 2.8 percent. The coverage module's own source note (sourceFor in src/core2/modules/coverage.ts) cites Census P60-284: employment-based coverage is 53.7 percent of the population. Either the counted rows (countedCoverage) cover far fewer people than the employers' plans reach, or the reader misreads what covered means; check both before changing the engine. The module records only employer and Medicare plans, so no figure here is an uninsured rate.

**Cause.** Measured: does not reproduce on main d64255aa (Nov 11). The item's own draws through `drawPlace(<draw>, "drift-played")` and `buildBenchWorld`, read with `vitals` from scripts/dev-tests/vitals.ts: Futiga, American Samoa (territory:AS:futiga, draw dpA) reads `employerPlanSharePct` 43.7 at the opening and 36 after a year; Willow Creek, California (0685642, draw dpC) reads 38.4 and 53. A third place, Townsend, Delaware (1072510, world seed 50a1b5116b69667928c30949d59ec893d9b92d60fa285085a628ee8fd0377f1a), reads 41.1 at the opening: the town 70.3 percent, a nearby place 35.5 and the county's records 40.9 (src/core2/modules/coverage.ts `countedCoverage` rows times each household's weight). All are near the 53.7 percent the module cites (Census P60-284), with the spread a small place has. Something merged since Nov 8 raised the counted rows; the reader counts them right.

**Fix.** Nothing to build. The CTO drops the item as done by main. If a played run again reads an employer-plan share under 10 percent, file a new item with its place, seed and the per-place split above.

**Time box.** 0.5 hours for the CTO to read this and drop the item. Seen: the share of a town's people with health coverage on the Metrics tab.

**Rules.** No dice. Find the cause by file and line: how many counted households hold a countedCoverage row against how many hold a job with an employer plan, and what the covered field counts. Real ranges are not targets (owner, Nov 8): fix only when nothing in the world explains the value.

**Done when.** A second session (not the builder) plays a world in two drawn places that name their seed, and reads the cause written into this item by file and line; the share of residents on an employer plan is explained by the world (employment, employer size and pay) or fixed, and the vital-statistics reader reports it, with its output quoted by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/coverage.ts, scripts/dev-tests/vitals.ts

**Notes.** Found by the Dev Tester, Nov 8 night.

Nov 11 (cause finder for Fable B): not reproduced. On main d64255aa the item's own draws read 43.7 and 38.4 percent at the opening (36 and 53 after a year). Townsend, Delaware reads 41.1. I propose dropping the item as done by main.
