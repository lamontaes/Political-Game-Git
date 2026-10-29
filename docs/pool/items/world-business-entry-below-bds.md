---
id: world-business-entry-below-bds
title: "Businesses open at a third of the Census rate in a played year (5 opened against about 16 in eight drawn towns); closures match"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #5369
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Businesses open at about a third of the Census rate in a played year: 5 opened against about 16 in eight drawn towns, while closures match. Find why entries run low, whether the entry rule, the capital a founder needs or the demand it reads. Fix it at the cause so the year's openings match the Census count within the stated spread.

**Rules.** No dice: an opening follows a founder's money, skills and the town's demand, never a percentage; real rates check totals only. Wire to the world: each opening moves money, jobs and a place's firm count.

**Done when.** In a one-year run of `buildBenchWorld` in eight drawn places with seeds the builder did not choose, openings land within the Census rate's spread, closures still match, and `src/core2/business.test.ts` states it with each new firm named by record id. **On screen.** Nothing yet: it would show on Jobs and study, and News, and nothing there reads it.

**Files.** src/core2/modules/business.ts, src/core2/business.test.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it. Unblocked Oct 23: world-counted-headcount-falls-faster-than-population is done and #5685 merged; CTO to retitle per the old blocked-on.

Measured Oct 20 (claude/pool-bds): the premise is out of date, and the error now runs the other way. `buildBenchWorld` two-level, 365 days, six drawn towns (`drawPlace(seed, "entry")`), firms that exist at the end and were not in the books at the start against the start count (BDS nation entry 9.06 percent, exit 8.68 percent, `src/core2/data/business/bds-rates.json`):

| place, seed                                 | firms start to end | opened | entry rate | closed |
| ------------------------------------------- | ------------------ | ------ | ---------- | ------ |
| Broomtown, Alabama, `e1`                    | 26 to 30           | 4      | 15.4%      | 0      |
| Charlotte Amalie, U.S. Virgin Islands, `e2` | 28 to 39           | 11     | 39.3%      | 0      |
| Chimayo, New Mexico, `e3`                   | 27 to 35           | 8      | 29.6%      | 0      |
| Ta'u, American Samoa, `e4`                  | 28 to 36           | 8      | 28.6%      | 0      |
| Ester, Alaska, `e5`                         | 28 to 38           | 12     | 42.9%      | 2      |
| Dewey Beach, Delaware, `e6`                 | 28 to 32           | 5      | 17.9%      | 1      |

Entry runs 1.7 to 4.7 times the Census rate and closures run at or below it (0 to 2 of about 28 against an expected 2 to 3), so the towns grow 15 to 40 percent in a year. `foundings` in `business.ts` returns after the first opening, so the whole world opens at most one firm a month; that cap is not what binds here. These are small samples (26 to 28 firms at the sample's scale), so the rate is noisy; a town at its Census scale should be measured before any rule is changed. Not changed. Question for the CTO: the item's title is wrong; retitle it to a check of entry and exit against `bds-rates.json` at Census scale, or drop it.

Oct 20 (claude, released unbuilt): read the Oct 20 measurement above; I did not repeat it. Entry at the bench sample scale cannot answer a Census-scale question, and `world-census-weight-economy` (PR #5454) is what sizes firms to the Census count, so a Census-scale check waits on it. The title should be changed to a check of entry and exit against bds-rates.json once that lands (CTO).

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: retitle to an entry/exit check against bds-rates.json at Census scale (item Note), or drop.
Oct 27 (claude pool worker): no longer true on main; entries now run ABOVE the Census rate. `scripts/core2-year/closures.mjs` (CORE2_BOOKKEEPING=0, one year, seeds sw1 to sw8 drawn from all 56) lists each business with a `founded` flag: Pajonal, Puerto Rico 13 of 43, Horace, North Dakota 20 of 50, Petoskey, Michigan 16 of 45, Tapochao, Northern Mariana Islands 7 of 37, Charlotte Amalie East, U.S. Virgin Islands 11 of 41, Umatac, Guam 10 of 40, Jasper, Tennessee 12 of 40, Toomsuba, Mississippi 6 of 36 (the flag also marks the opening's press outlets, up to about ten a town, so these overcount market entries). The M1-08 check in Cochituate, Massachusetts counts 10, 12 and 12 openings in three years against the BDS entry range of 8.4 to 11.0 percent of 30 to 62 businesses (3 to 7 a year), all in one market a month: see the diagnosis in business-never-adds-location (the founding loop returns after one founding a month, always in the top-scoring market). The fix for both is the same change to `foundings` in src/core2/modules/business.ts, so this item is folded into that diagnosis; closures match (0 to 7.3 percent, under the 10 percent ceiling). Left open for the business lead; do not build the "raise entries" this item names.
