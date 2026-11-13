---
id: core-country-tier-empty-sector-prices-run-away-in-dc
title: "A played world in Washington, D.C. stops within three months: an empty sector in the country tier sends prices, demand and job openings past any bound"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: opus
effort: high
root: none
source: found Nov 11, 2026 by the cause finder for Fable B, running tests-loan-cap-case-red-by-draw
---

**What.** A played world whose town is Washington, D.C. (place 1150000) throws `RangeError: Map maximum size exceeded` on its first monthly jobs review in April 2025, so the game cannot be played there past the end of March. The error is the jobs engine's positions table passing JavaScript's limit of about 16.7 million rows in one review. The jobs engine is only the last step: the country tier's D.C. prices double in two months, the region's price level follows, every D.C. business's yearly demand runs into the quintillions, and each one opens openings for staff it computes in the trillions. Seen: the bench in the nation's capital stops on its first April instead of playing on, and dev mode's Metrics tab shows the capital's price level doubled by February.

**Cause.** Found in code: in src/core2/country-model.ts, the sector price step (lines 1488 to 1493) sets `busy = row.jobs > 0 ? plan.staffNeeded / row.jobs : 1` and moves the price by `(rules.priceBusyPerYear / months) * Math.log(Math.max(busy, TINY))`. `Math.max(busy, TINY)` (TINY is 1e-9, line 42) floors the ratio but nothing bounds it from above, and a sector with a floating-point leftover of jobs counts as staffed. When the played town is D.C., the town's part takes nearly all of the state's jobs, so the rest of the state is left with 0 jobs in ten of its eleven sectors. Measured with seed c2ff19100a2c2f424292deca7b7fe760abec51ebe682d9ad572706e6ff3ae925, Washington, D.C. (1150000), the world src/core2/law-wiring-housing.test.ts builds (`GOLDEN_PATH_PLACE_KEY=1150000 GOLDEN_PATH_WORLD_SEED=<that seed>`, main 8c980a59), by probes since undone:

- In the first month, D.C.'s education-health sector holds 4.5e-13 jobs against 272.9 staff needed, so `busy` is 6.0e14 and its price jumps.
- D.C.'s state prices reach 2.01 by 2025-02-01. src/core2/modules/macro.ts `stepRegional` (line 497) passes them on: region:11:metro:47900 goes from a price level of 108.5 to 218.3, and `publishConditions` (line 165) writes a general price factor of 2.02.
- The next month's `macroDemandFactor` is 8.3e9 (the probe in src/core2/finance-state.ts at the business review, line 1418). An inn's demand becomes $3.2e16 a year.
- On 2025-04-01, src/core2/modules/jobs.ts `reviewEmployers` (line 1328) reads the professional firm organization_b51e7c2cdb9b6333: annual demand $1.18e18 against a capacity of $91 million, a target of 6.9e11 staff and a `need` of 9.7e10. Its loop then puts one position per pass at line 1509 until the Map overflows.

The rest of the country is untouched; the national month stays normal (output gap -0.15%).

Second cause (R2 for Fable B, Nov 11, 10:20 UTC, same seed, measured on main 32c2d605 with the first fix applied; probes since undone). The first fix alone holds D.C.'s state prices at 1.03 on Feb 19 (2.02 without it), but the world still stops with the same `Map maximum size exceeded`. Both causes come from one place: when the played town is D.C., `takeOutPart` (src/core2/country-model.ts) leaves the rest of D.C.'s state with its people (44,000, of whom 18,100 are looking) and no jobs, so every sector is scaled by `scaleWithJobs` to a floating-point leftover (0, or 4.5e-13 in education-health) with its expected sales scaled to match. In month 1 the empty sectors hire back from nothing (education-health 780 jobs, government 15,000). The sales-expectation update in `stepCountry` (`grew = plan.sold / row.expectedSales - 1`, then `row.expectedGrowth += (grew - row.expectedGrowth) / rules.salesViewMonths`) reads that as growth against a base of almost nothing. In month 2 `demands` multiplies the expected growth into investment: D.C.'s `invested` is 7.13e20 (1.86e5 in month 1). D.C.'s demand for manufacturing is then 2.14e20 (California's is 1.9e10), so the nation's traded manufacturing demand is 1.93e20 against a supply of 3.8e11. Because a traded sector's `busy` is the nation's traded demand over the nation's supply, every state's manufacturing price reaches 2.33 and information 2.29 by Mar 21 (Wisconsin, Indiana and Michigan alike), the mean of the states' prices goes from 1.006 to 1.48, and the jobs engine's openings overflow in April as before. In Zillah, Washington (5380500, world seed probe-zillah-1) the same months stay normal: traded manufacturing demand 1.33e11 to 1.35e11, states' prices up about 0.2 percent a month.

**Fix.** Two parts, both one rule for every place.

1. Done on branch `claude/red-country-tier-empty-sector` (0b9001b4): in the sector price step, the busy term is multiplied by `row.jobs / (row.jobs + ONE_JOB)`, so a sector with a fraction of one job has no staffing pressure and one with thousands is unchanged to a fraction of a percent.
2. Still to build, a design choice inside the country tier, which the builder makes and records: a sector's expected growth must not be read from a base the part left nearly empty. Fading the growth update by the same `jobs / (jobs + ONE_JOB)` is not enough. The fade times the growth comes to the sales sold measured in jobs' worth of the old base, about 780 for education-health here, which is still runaway. Choose one of these and prove it: (a) read the month's growth per job (sales per job against expected sales per job at the month's opening), so a sector that regrows its staff reads the change in what each job sells, not the hiring; or (b) stop `takeOutPart` from shrinking a sector's books to a floating-point leftover: when the part takes all but a fraction of a job, keep the rest's per-job figures (expected sales, cash, other buyers per job) and let its jobs start from what the rest's own people can staff. Whichever is chosen, the expectedGrowth line keeps its `// perception:` comment, and no number is typed into a clamp (no-steering guard).

Keep the cost term and `countryProblems` as they are. Nothing in jobs.ts, finance-state.ts or macro.ts changes. A test in src/core2/country-model.test.ts holds both: a state whose sectors are left with 1e-12 jobs and its people, stepped three months, keeps its prices, its investment and the nation's traded prices within one month's normal rise.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the guard reads the sector's own jobs, and no state or place is named in code. Sliding scales and causes: the pressure fades smoothly with the jobs, with no threshold. Never weaken a check: the tier's own bookkeeping check (`countryProblems`) stays as it is.

**Done when.** A second session runs `GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0 GOLDEN_PATH_PLACE_KEY=1150000 GOLDEN_PATH_WORLD_SEED=c2ff19100a2c2f424292deca7b7fe760abec51ebe682d9ad572706e6ff3ae925 HOUSING_DAYS=240 npx vitest run src/core2/law-wiring-housing.test.ts -t "cap consumer loan rates"` and sees the world in the drawn place Washington, D.C. play its 240 days with no `Map maximum size exceeded`. Then it starts the bench in Washington, D.C. on a fresh seed, plays to the first July, and sees in dev mode's Metrics tab that D.C.'s price level stays within a few percent of the nation's.

**Waits on.** Nothing.

**Files.** src/core2/country-model.ts, src/core2/country-model.test.ts

**Notes.** Found while running tests-loan-cap-case-red-by-draw. With `HOUSING_DAYS=240` and GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0, the housing file's draw passed over ten worlds; six of the eleven it built were in Washington, D.C. The eleventh, D.C. with seed c2ff1910…e925, crashed after 1,854 seconds of the run. The housing file therefore meets D.C. often, and a crash there fails the whole file.

**Notes (R2 for Fable B, Nov 11, 10:25 UTC).** The second cause above was found after the first fix was built; the first fix is on its branch and was not opened as a pull request, because alone it does not stop the crash. Done when stands: no pull request until a whole played year in D.C. on this seed runs to the end with prices in a sane range and a drawn state is unchanged.

Seen in play by Playtester P2, Nov 13, 2026 (Washington, District of Columbia, seed e087a8d7-f6db-4a9f-9ae5-97ee6c1b8ab7, main 596d5127, Advanced start as Councilmember Curtis Pruitt, on the bench, one heavy process at a time on the machine). The world no longer throws, but dev mode's run-year took 99.7 seconds for 2025, 242.4 for 2026, 181.0 for 2027, 462.0 for 2028 and 323.6 for 2029. The same machine ran other places' years in 9 to 24 seconds (Newfane, Vermont; Millville, New Jersey; Maloata, American Samoa). The growth fits this item's runaway prices and demand; the finder checks D.C.'s sector prices after each of those years.
