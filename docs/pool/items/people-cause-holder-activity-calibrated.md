---
id: people-cause-holder-activity-calibrated
title: "By year three a person with a cause acts on it more than once a day and belongs to about 17 cause groups"
area: people
kind: research
priority: 2
size: M
status: claimed
claimed-by: claude/cause-activity-research
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T10:42:24.873Z
---

**What.** Bedford, Wyoming (key 5606045, seed 9a4dd331ace7), main 01f5cd4715, three played years, counted at each year's end: cause holders 10, 74 and 74; drives 17, 329 and 367; acts on drives that year 3,483, 15,495 and 34,301 (about 460 a holder in year three); cause groups 3, 31 and 34; group memberships 209, 1,045 and 1,906 among 69, 101 and 115 members (about 17 each in year three). Nothing in the drives engine checks these against how often real people volunteer, give, contact officials or attend meetings, or how many groups they belong to, and it is the main reason a town's third year runs slower than its first (core-later-years-slower-drive-holders-offers). Find sourced rates for each and calibrate how a holder's time, money and traits limit their cause acts and how each further group pulls less, so the totals land in the sourced bands.

**Rules.** Simulate it, don't ask (owner, Oct 24): built from research, calibrated, no question to the owner. No dice: real rates check the totals; a holder's traits, time, money, ties and the groups they already hold decide each act. Sliding scales and causes: no cap or cutoff; each further group or act pulls less. Every number in a parameter table, SOURCED or ESTIMATED with its source and spread.

**Done when.** data/research/people holds the CEV 2017 to 2023 national rates and the Census Bureau's 2024 hours per volunteer, each with its source, quotes and limits, and scripts/research/cause-activity-year.ts reads both: for Bedford, Wyoming (seed 9a4dd331ace7) and a place drawn from all 56 (named with its seed), three played years of buildBenchWorld, it prints each cause act's share of full adults, times per person and hours per volunteer beside its band, with the lines in the PR body. The engine change that brings the totals into the bands is people-drives-cause-acts-pull-less.

**Files.** src/core2/modules/drives.ts, src/core2/data/drives.json

**Notes.** Filed Oct 25 by the speed lead, replacing the owner question on how often a person with a cause acts (asked in the speed channel Oct 24; the Oct 24 standing ruling says to simulate it from research instead). Counts from scratchpad drive-years.mts (drivesReport and core.memberships at each year's end).

Done when amended Oct 25 by the speed lead before the PR, as the researcher skill says: research records the bands and the report that reads them; the drives engine change goes to the area's builder (people-drives-cause-acts-pull-less).
