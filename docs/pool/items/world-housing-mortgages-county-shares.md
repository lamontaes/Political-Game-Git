---
id: world-housing-mortgages-county-shares
title: "Opening mortgages follow the county's own move-in years and mortgage shares by age, not the nation's"
area: world
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** openingMortgages in src/core2/housing-mortgages.ts gives every owner a purchase year from the nation's ACS B25038 move-in distribution and decides which owners still owe from the nation's B25027 mortgage shares by age, so a retirement county and a new suburb open with the same mortgages. The 2020-2024 ACS rows for every state and county are now in data/research/world/acs-2024-owner-mortgage-moved-in-by-county.json, checked against the national shares. Read the town's county row (its state's where the county has too few owners, the nation's for the four island areas the ACS does not cover), so who owes and how long ago they bought follow the place. Refinancing from the rate history (historicalMortgageRate) belongs in the same change if the owner's reasons can carry it.

**Rules.** One rule, all 56 places: the county row is looked up by the town's county FIPS from data, never a state named in logic, and the island areas take the nation's shares marked as an estimate. No dice: who still owes stays decided by each owner's age, purchase year and cash, as now; the county shares only change how many in each band, and the real totals check the town.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) the opening mortgages' share of owners with a loan in each age band matches the drawn place's county row in the research file within a stated spread, named by mortgage record ids, a test in src/core2 checks it, and SG-WORLD-housing-mortgage-history is cleared or kept with a reason.

**Files.** src/core2/housing-mortgages.ts, src/core2/data/housing/housing.json, data/research/world/acs-2024-owner-mortgage-moved-in-by-county.json, src/core2/data/stopgaps.json

**Notes.** TODO
