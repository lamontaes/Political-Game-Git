---
id: housing-lomas-rent-below-municipio-floor
title: "Lomas, Puerto Rico median rent sits about 1% under its state's lowest municipio median"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** After the town reads its own municipio (Canóvanas, 72029, median rent 568), the town's median rent at the start of the year is 345.03 against a floor of 349 in the state's county medians (seed 591a7dea70e8601ff33ba68cdc050acfd4eee1b0b96f73c00c9606d9e7decf31, place key 7246626, m1-05-check). The lookup is right; the scaling of rent by household income puts the renters' median below the county median. Find whether the income scaling or the renter median is what the check should accept, with the cause by record.

**Rules.** No dice; research calibrates, never decides an outcome. One rule, all 56 places: no place named in logic.

**Done when.** m1-05-check for the place above passes its rent clause with the cause named, or the clause is changed with the owner's reading line.

**Files.** src/core2/modules/housing.ts, src/core2/tooling/m1-05-check.ts

**Notes.** Cause traced (One Map, Nov 5). Each home's value is scaled by its household's income against the **owners'** own median scale (`ownerMedianScale`), but each rent is scaled against the **whole town's** median income. The sourced rent (ACS B25064) is the **renters'** median, and renters are the households left after the older, better-off ones are drawn as owners, so their median rent comes out below the municipio's. At Lomas the municipio (Canóvanas, 72029) median is $568 and the town's median rent comes out $345.

Tried and not shipped: dividing each rent by the renters' median scale, as values already do for owners (branch `one-map-rent-renters`, pushed, no PR). It lifts Lomas to $535 to $544 and its rent clause passes, but it raises every town's rent by about half, and `housing-counted-evicted.test.ts` (Storrs, Connecticut) fails on seeds 6a82eee4d36f05a3 and 23a69275e4623bd5 where main passes both. Evictions and homeless counts are calibrated to today's rent levels, so the change needs the eviction and homeless calibration re-checked (and `housingRentIncomeElasticity` and `housingIncomeOffsetShare` re-read) in the same PR. That is the housing owner's call.

**Update, Nov 5 (One Map, owner's answer "Fix it, recheck evictions").** The fix is built and pushed on branch `one-map-rent` (no PR, because a green PR needs the eviction model re-fit first).

- **Rent levels.** Eight drawn towns, median rent at the start of the year as a share of the sourced county or municipio median: before 60 to 69 percent in seven of eight (island-area town 94 percent); with the renter-median fix 93 to 108 percent, so it does not overshoot (largest +8 percent). Lomas, Puerto Rico: $345 to about $540 against $568. Tool: `src/core2/tooling/rent-sourced-table.ts`.
- **Storrs, Connecticut test (seeds 6a82eee4d36f05a3 and 23a69275e4623bd5).** All three failures were the test reading state the design does not guarantee, now fixed without weakening what they assert: a husk-tier relative has a person record while the household is still counted; the director folds an old moment into its month summary (owner, Oct 11); and a household filled in, returned to the counts and filled in again has a person record that collected pay of its own, so fill-in adds the group's share to what they hold (after = before + share). Both seeds pass.
- **What is still open: the eviction model's calibration.** One played year, the same eight towns, main against the fix (tool `src/core2/tooling/rent-year-counts.ts`): eviction cases 380 to 888, cases reaching removal 236 to 634, homeless 64 to 539. Seven of the eight towns move modestly (cases 231 to 304, homeless 22 to 41); Honolulu (1571550) dominates (cases 149 to 584, homeless 42 to 498). The pinned Puerto Rico case in `housing-calibration.test.ts` (place 7237336) now fails its burden-shape check: 166 of 188 renters sit in the top burden band (over 32 percent of income), so cases cannot be seen to rise faster past 32 percent. That test passes on main only because rents were too low.
- **Raising `housingRentIncomeElasticity` is not the fix.** At 0.6 (inside its 0.2 to 0.7 spread) the pinned Puerto Rico case passes, but the same eight towns go to 1,118 cases and 993 homeless: worse. `housingIncomeOffsetShare` was not swept.
- **Next.** Re-fit the burden-to-court-case rates (the eviction model's per-band rates in housing.json, `eviction` and `evictionDefaults`) against the HUD Continuum of Care counts per 10,000 for a spread of drawn towns, then ship the rent fix with the re-fit in one PR. Needs a sourced rent-burden distribution (ACS B25070); the Census API needs a key, so the table has to come from a downloaded file. Report before and after counts in plain English when it ships.
