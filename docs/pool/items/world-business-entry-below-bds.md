---
id: world-business-entry-below-bds
title: "Businesses open at a third of the Census rate in a played year (5 opened against about 16 in eight drawn towns); closures match"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/business-entry-bds
pr: #5369
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:08:46.978Z
---

**What.** Businesses open at about a third of the Census rate in a played year: 5 opened against about 16 in eight drawn towns, while closures match. Find why entries run low, whether the entry rule, the capital a founder needs or the demand it reads. Fix it at the cause so the year's openings match the Census count within the stated spread.

**Rules.** No dice: an opening follows a founder's money, skills and the town's demand, never a percentage; real rates check totals only. Wire to the world: each opening moves money, jobs and a place's firm count.

**Done when.** In a one-year run of `buildBenchWorld` in eight drawn places with seeds the builder did not choose, openings land within the Census rate's spread, closures still match, and `src/core2/business.test.ts` states it with each new firm named by record id.

**Files.** src/core2/modules/business.ts, src/core2/business.test.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.

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
