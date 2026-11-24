---
id: world-census-scale-foundings-above-sample
title: "Washington, D.C. at its Census size founds 6 businesses in a year against 1 at the sample size"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: world-census-scale-closures-large-cities
lead: jobs
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Washington, D.C. (1150000, seed dc-closures-a) opened at 69 times its sample founds six businesses in a year (inns, construction, a restaurant, retail, information), while the same city at the sample size founds one inn. None of the six closes, after the change for world-census-scale-closures-large-cities stopped filled-in households and full owners keeping money that stood for many households. The suspicion is that some founding reason reads a weighted figure against an unweighted one: the growers' cash against a cushion from the book payroll, a counted candidate's cash and savings against the startup cost, or the prospect against the median pay. Find which one and weight it. Per the Nov 8 ruling that ranges are not targets, a gap between the two sizes is fixed only if nothing in the world explains it. Seen: the business list of a large city such as Washington, D.C., which opens six businesses in a year where the sample town opens one.

**Cause.** Found in code: a counted person's regional hire is added to the wrong unit, so a big city's job count, and with it every business's demand, runs away. `CountedHousehold.unplacedWorkers` is per record at the opening: src/core2/modules/residents.ts line 710 from `openingUnplaced`, and the newcomers' `jobShare` in src/core2/modules/counted-moves.ts line 1381. `residentsPart` (residents.ts line 2566), `unplacedShare` (line 451) and src/core2/modules/world-panels.ts line 75 read it that way, times the household's weight. But `startRegionalWork` (residents.ts line 3736) adds `rt.store.weightOf(h)` for each counted person hired into regional work, and `stopRegionalWork` (line 3787) and src/core2/modules/jobs.ts line 921 (`h.unplacedWorkers / counted.weightOf(h)`) treat it as the total. At the sample size the weight is 1 and both readings agree. At Census size each hire counts weight × weight people. Measured: Washington, D.C. (1150000, seed dc-closures-a, `countScale` 69, `buildBenchWorld`). The households' `unplacedWorkers` summed 24,730 at the opening, 35,525 a month later and 71,868 after two months. Weighted by `residentsPart`, that is 305,632, then 696,999, then 2,068,788 workers outside a recorded employer, against 589,000 adults. The state's part (`townPartCounts`, src/core2/modules/macro.ts line 320) carried those jobs, so DC's jobs against their base (`countryStateNow`) read 1.215, 2.398, then 6.580. The region's demand (`regionalFactors`, src/core2/modules/regional.ts line 229) and DC's `macroDemandFactor` (`publishConditions`, macro.ts) went 1.21, 2.38, then 6.48, and `projectMarket` multiplied every business's demand by it. organization_38708aabff0a980b's demand reached 7.1 times its anchor, against 1.08 times at the sample size. In that inflated market, the press owners opened 11 new information locations in the year (one a month, demand 16 to 468 percent above capacity), against none at the sample size. The sample size founded 9 ordinary firms (inns, manufacturing, building services). The suspicions in What (growers' cash, a candidate's cash, the prospect against median pay) are not the cause.

**Fix.** Keep `unplacedWorkers` per record, the unit the opening and four readers already use. (1) In `startRegionalWork` (src/core2/modules/residents.ts), add 1 worker, not `weightOf(h)`, and add one worker's pay to the place's unplaced flow: `perWorker / perYear`, the pool's per-record rate from `openingUnplaced`. (2) In `stopRegionalWork`, take away `Math.min(1, h.unplacedWorkers)` and the same pay. (3) In src/core2/modules/jobs.ts line 921, use `h.unplacedWorkers` as the record's count, without dividing by the weight. (4) Read every other use in the grep list (`git grep -n unplacedWorkers -- src/core2`) and leave each one reading per record. Add a test in src/core2 beside census-scale-closures-large-cities.test.ts. It plays Washington, D.C. at Census size (seed dc-closures-a) for four months and asserts two things: the weighted unplaced workers stay at or below the working-age adults, and DC's `macroDemandFactor` stays within 10 percent of the same seed's at the sample size. Then rerun the founding comparison in this item's Done when.

**Time box.** 4 hours for one Sonnet session; each Washington world takes about 3 minutes to build and 3 to play four months. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: every founding reason reads its money and the book at the same weight. No dice: a business is founded from its founder's reasons and the market's room, never a monthly chance. Ask why: each founding names its reasons by record id.

**Done when.** A second session (not the builder) plays Washington, D.C. at its Census size (seed dc-closures-a) and one more drawn place above 100,000 (seeds named), lists a year's foundings in `buildBenchWorld` by founding record id, and sees each Census-size founding explained by a recorded reason, or the year's count match the same town's count at the sample size plus its spread; a test in src/core2 beside census-scale-closures-large-cities.test.ts shows it. On screen: nothing yet; it would show on Politics, Campaigns and the election night results, and nothing there reads it.

**Waits on.** Nothing. world-census-scale-closures-large-cities is done.

**Files.** src/core2/modules/residents.ts, src/core2/modules/jobs.ts, src/core2/modules/macro.ts, src/core2/modules/regional.ts, src/core2/modules/business.ts, src/core2/census-scale-closures-large-cities.test.ts

**Notes.** TODO

**Notes (Fable's check, Nov 10).** How to find the cause: in the Washington, D.C. replay at Census size and at sample size, print each founding's reasons from `foundings` and `found` in src/core2/modules/business.ts and see which term differs between the two sizes (growers' cash, a counted candidate's cash against the startup cost, or the prospect against median pay). The fix then weights that one term, so the count of foundings follows the town's real size and not the sample's.

Nov 11 (cause finder for Fable B): traced on main d64255aa with four probes outside the repository: foundings by size, the information books, the place's monthly paid income and the state's part. The extra Census-size foundings are press locations chasing demand that the place's macro demand factor inflated 6.5 times. That factor follows DC's state jobs, which follow the town's counted unplaced workers, and `startRegionalWork` adds those by the household's weight in a field every reader multiplies by the weight again. This likely touches world-counted-weight-release-overstaffed-red-again (same city and seed); it was not checked here.
