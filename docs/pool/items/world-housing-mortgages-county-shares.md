---
id: world-housing-mortgages-county-shares
title: "Opening mortgages follow the county's own move-in years and mortgage shares by age, not the nation's"
area: world
kind: feature
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-world-housing-mortgages-county-shares
pr: #8546
blocked-on:
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:48:26.982Z
merged-at: 2026-11-12T19:10:28.595Z
---

**What.** openingMortgages in src/core2/housing-mortgages.ts gives every owner a purchase year from the nation's ACS B25038 move-in distribution and decides which owners still owe from the nation's B25027 mortgage shares by age, so a retirement county and a new suburb open with the same mortgages. The 2020-2024 ACS rows for every state and county are now in data/research/world/acs-2024-owner-mortgage-moved-in-by-county.json, checked against the national shares. Read the town's county row (its state's where the county has too few owners, the nation's for the four island areas the ACS does not cover), so who owes and how long ago they bought follow the place. Refinancing from the rate history (historicalMortgageRate) belongs in the same change if the owner's reasons can carry it.

**Cause.** Found in code: openingMortgages in src/core2/housing-mortgages.ts (line 64) uses the national ACS B25038 and B25027 shares; the county rows are in data/research/world/acs-2024-owner-mortgage-moved-in-by-county.json (registered stopgap SG-WORLD-housing-mortgage-history in src/core2/data/stopgaps/world.json).

**Fix.** Read the town's county row (the state row where the county has too few owners, the national row marked ESTIMATED for the island areas) for who owes and the purchase year, and add refinancing from the rate history if the owner's reasons can carry it.

**Time box.** 5 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the county row is looked up by the town's county FIPS from data, never a state named in logic, and the island areas take the nation's shares marked as an estimate. No dice: who still owes stays decided by each owner's age, purchase year and cash, as now; the county shares only change how many in each band, and the real totals check the town.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body) and sees the opening mortgages' share of owners with a loan in each age band reported beside the drawn place's county row in the research file, named by mortgage record ids, a test in src/core2 checking that the county row is the one read, and SG-WORLD-housing-mortgage-history cleared or kept with a reason. On screen: nothing yet; it would show on News, and nothing there reads it.

**Waits on.** Nothing.

**Files.** src/core2/housing-mortgages.ts, src/core2/data/housing/housing.json, data/research/world/acs-2024-owner-mortgage-moved-in-by-county.json, src/core2/data/stopgaps/world.json

**Notes.** TODO
