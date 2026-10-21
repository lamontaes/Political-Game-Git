---
id: world-counted-renter-income-puerto-rico-third
title: "Counted renters in Puerto Rico earn about a third of their ACS income: half of them pay over 72 percent of income in rent on day one"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In Puerto Rico place 7237336 (world seed 63ef211a72f7f8d3519652d91152eaf5cda51a871ae2bed4e9221c537c7bd2f8), with rents now read from Puerto Rico's own counties, the counted renter households' median rent is 380 dollars a month and their median income 6,295 dollars a year, a burden of 72 percent; 85 percent of them are over 32 percent. USAFacts' reading of the ACS puts Puerto Rico's median gross rent at about 580 dollars, 37.5 percent of renter income (2024), so a median renter income near 18,560. householdIncome (modules/residents.ts) counts wages, retirement awards and each household's share of the place's unplaced workers (the same fraction for every jobless adult, here 0.29 of 21,680 dollars), but no public transfers, and the even share makes every jobless household alike. Find where the gap comes from (transfers not counted, the unplaced share spread evenly, or the opening's employment target) and fix it at the cause for all 56 places.

**Rules.** One model, two tiers: a counted household's income is read by the same rule as a full household's, times its count. Estimate, never UNKNOWN: incomes start from the place's sourced figures with a spread. Wire to the world: what changes is shown by the households' rent burdens and court cases in a played year.

**Done when.** In the Puerto Rico world above and two places drawn from all 56 (seeds named), built with buildBenchWorld, counted renter households' median rent-to-income ratio on day one is within 10 points of the place's sourced ratio, quoted from a fetched page, and housing-calibration.test.ts still passes.

**Files.** src/core2/modules/residents.ts, src/core2/residents.ts, src/core2/housing-calibration.test.ts

**Notes.** Found working world-homeless-puerto-rico-far-above-hud; the homeless count there is fixed by reading the territory's rents.
