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

Measured Oct 21 (claude; scratch probe over `rt.store.liveHouseholds()` and `householdIncome`, day one, `buildBenchWorld` two-level, placeKey 7237336, world seed 63ef211a72f7f…bd2f8): 197 counted renter households, median rent $913.75 a month (not the 380 of the first note: rents have changed since), median income $6,223, median burden 176 percent, 169 of 197 with no recorded wages, 0 with a retirement award, 177 with a share of the unplaced workers. The unplaced pool pays $21,680 a worker and each jobless working-age adult holds 0.29 of one, so a household with no job has an income of 0.29 x 21,680 = about $6.2 thousand, the same for all of them. That is the whole of the income of 86 percent of renters there. For comparison two drawn places read normal on day one: Merriam, Kansas (seed bu-a) 1,962 renters, median income $56,389, burden 27 percent; Brentwood Colony, South Dakota (seed bu-b) 1 renter, 26 percent. So the gap is specific to a place where recorded jobs are few against the employment target: `unplaced = max(0, target - employed) x counted share` in `src/core2/residents.ts` (about line 770) and the even share in `residents.ts` modules (about line 574, `h.unplacedWorkers = open.get(h.index) * share`). Two causes remain, both builder work: (1) the even fractional share (every jobless household gets 0.29 of a worker, so none has a real wage or none a whole one): give whole unplaced workers to households by their members' own traits and ages, as the full tier's jobs do, so incomes spread; (2) no public transfers in `householdIncome` (Puerto Rico's transfer share of household income is far above the states'), which a sourced per-place transfer figure would add. Not built: both change every counted household's opening income in all 56 places and need the calibration tests re-run. Claim released.
