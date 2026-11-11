---
id: core-country-tier-empty-sector-prices-run-away-in-dc
title: "A played world in Washington, D.C. stops within three months: an empty sector in the country tier sends prices, demand and job openings past any bound"
area: core
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: sonnet
effort: low
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

**Fix.** In src/core2/country-model.ts, let a sector's staffing pressure on its price fade with how few jobs it holds, on a sliding scale with no cutoff. Multiply the busy term by `row.jobs / (row.jobs + 1)`, so a sector with a billionth of a job has no pressure and a sector with thousands is unchanged to a fraction of a percent. Keep the cost term as it is. Add a case to src/core2/country-model.test.ts: a state whose sectors hold 1e-12 jobs with positive staff needed keeps its price within one month's normal rise. Nothing in jobs.ts, finance-state.ts or macro.ts changes: once the tier's prices hold, their numbers stay bounded. Related, not needed for this fix: core-country-tier-more-jobs-than-workers-in-outcome-web-tests is why a played part can take more of its state's jobs than the state can spare.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the guard reads the sector's own jobs, and no state or place is named in code. Sliding scales and causes: the pressure fades smoothly with the jobs, with no threshold. Never weaken a check: the tier's own bookkeeping check (`countryProblems`) stays as it is.

**Done when.** A second session runs `GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0 GOLDEN_PATH_PLACE_KEY=1150000 GOLDEN_PATH_WORLD_SEED=c2ff19100a2c2f424292deca7b7fe760abec51ebe682d9ad572706e6ff3ae925 HOUSING_DAYS=240 npx vitest run src/core2/law-wiring-housing.test.ts -t "cap consumer loan rates"` and sees the world in the drawn place Washington, D.C. play its 240 days with no `Map maximum size exceeded`. Then it starts the bench in Washington, D.C. on a fresh seed, plays to the first July, and sees in dev mode's Metrics tab that D.C.'s price level stays within a few percent of the nation's.

**Waits on.** Nothing.

**Files.** src/core2/country-model.ts, src/core2/country-model.test.ts

**Notes.** Found while running tests-loan-cap-case-red-by-draw. With `HOUSING_DAYS=240` and GOLDEN_PATH_SEED=c443c640669c9f2eb72d974b0cf926a6305a74b0, the housing file's draw passed over ten worlds; six of the eleven it built were in Washington, D.C. The eleventh, D.C. with seed c2ff1910…e925, crashed after 1,854 seconds of the run. The housing file therefore meets D.C. often, and a crash there fails the whole file.
