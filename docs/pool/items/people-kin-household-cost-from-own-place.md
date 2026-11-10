---
id: people-kin-household-cost-from-own-place
title: "A relative's household outside the town spends by its own place's region and rent, not the town's"
area: people
kind: stopgap
priority: 3
size: S
status: open
claimed-by:
pr:
after: people-kin-placement-by-distance
blocked-on:
source: stand-in triage Nov 10 2026 (docs/stopgaps/triage-2026-11-10/p15.md)
lead: lives
standard: 2
model: sonnet
effort: medium
root: design-country-tier
---

**What.** Each relative's household outside the town spends a Consumer Expenditure basket for its size and a HUD shelter budget. Both are read for the town's region and the town, because the relative carries only a county or a state. Once `people-kin-placement-by-distance` gives a relative a real place, price the household at that place's region and HUD row. Closes SG-P15-kin-living-cost-region.

**Cause.** Found in code: `src/core2/population.ts` line 1911 (`stopgap("SG-P15-kin-living-cost-region")`, then `hudRentRowFor(input.town, input.seed)` at line 1912 and `householdDailyCostMinor` just after) prices every kin household with the town's region and rent row.

**Fix.** After `people-kin-placement-by-distance` lands, read each kin household's recorded place, take that place's region for `householdDailyCostMinor` and its HUD rent row for the shelter budget, and delete the stopgap call and marker. A household whose place is a state only reads that state's region and the state's average HUD row, marked as an estimate with its source. Cost: computed once when the kin are generated, not daily.

**Time box.** 2 hours for a Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One rule, all 56 places: the region and rent row come from place data keyed by postal code, never a named state. Estimate, never UNKNOWN: a relative whose place has no HUD row starts from the state average, marked ESTIMATED. Wire to the world: the money the kin households spend lands in the outside account for their place.

**Done when.** A second session, in a one-year `buildBenchWorld` in a drawn place (place and seed named in the PR), finds a relative's household living in another state or region whose yearly living cost differs from the town household's for the same size, by household id, and sees the stopgap row SG-P15-kin-living-cost-region resolved in `src/core2/data/stopgaps/p15.json`.

**Waits on.** people-kin-placement-by-distance.

**Files.** src/core2/population.ts, src/core2/opening-kin.ts, src/core2/data/stopgaps/p15.json
