---
id: jobs-no-openings-in-small-towns
title: "A small town's employers open no position in a whole year: Fort Laramie, Wyoming has 27 businesses, 7 separations and 0 openings"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Fort Laramie, Wyoming (place 5628230, seed off:0, a played year from January 20, 2025) the jobs engine opened no position at all: 27 businesses, 7 separations (2 layoffs, 3 quits, 2 left-work) and 0 rows in the positions table, so a jobless adult of any fit got nothing to apply for. A business opens a position only when its accumulated need reaches a whole head, and a small employer's need grows by a fraction of its gap each month, so a replacement can lag a year. Read the monthly review in reviewEmployers against real turnover (JOLTS openings run near 4 to 5 percent of jobs a month) and make a lost worker's seat reopen from the employer's own books and cash on a sliding scale, not only after the need builds up.

**Rules.** No dice: an employer reopens a seat from its books, its cash and its owner's traits, never a roll or a fixed wait. One rule, all 56 places: the same read for every town, with the real turnover rate checking totals only. Replace, never layer: the slow accumulation is replaced by the read, not kept beside it.

**Done when.** In a one-year played world (buildBenchWorld, Fort Laramie 5628230 with seed off:0, and two drawn places with seeds the builder did not choose) every town with separations shows openings opened for them, shown by position record ids, openings per month within the JOLTS spread for the town's size, and the jobs tests and src/core2/jobs-player-offers.test.ts pass. The owner plays it: a jobless 18-year-old in a small town sees openings to apply for.

**Files.** src/core2/modules/jobs.ts, src/core2/jobs-player-offers.test.ts

**Notes.** Found Oct 19 measuring world-player-jobless-no-offers. In the same year the player's first offer came in week 11 in Addison, West Virginia and week 19 in Glenwood, North Carolina, and never in Fort Laramie or Orient, South Dakota.
