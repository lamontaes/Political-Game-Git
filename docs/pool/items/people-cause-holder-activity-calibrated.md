---
id: people-cause-holder-activity-calibrated
title: "By year three a person with a cause acts on it more than once a day and belongs to about 17 cause groups"
area: people
kind: research
priority: 2
size: M
status: done
claimed-by:
pr: #6077
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Bedford, Wyoming (key 5606045, seed 9a4dd331ace7), main 01f5cd4715, three played years, counted at each year's end: cause holders 10, 74 and 74; drives 17, 329 and 367; acts on drives that year 3,483, 15,495 and 34,301 (about 460 a holder in year three); cause groups 3, 31 and 34; group memberships 209, 1,045 and 1,906 among 69, 101 and 115 members (about 17 each in year three). Nothing in the drives engine checks these against how often real people volunteer, give, contact officials or attend meetings, or how many groups they belong to, and it is the main reason a town's third year runs slower than its first (core-later-years-slower-drive-holders-offers). Find sourced rates for each and calibrate how a holder's time, money and traits limit their cause acts and how each further group pulls less, so the totals land in the sourced bands.

**Rules.** Simulate it, don't ask (owner, Oct 24): built from research, calibrated, no question to the owner. No dice: real rates check the totals; a holder's traits, time, money, ties and the groups they already hold decide each act. Sliding scales and causes: no cap or cutoff; each further group or act pulls less. Every number in a parameter table, SOURCED or ESTIMATED with its source and spread.

**Done when.** data/research/people holds the CEV 2017 to 2023 national rates and the Census Bureau's 2024 hours per volunteer, each with its source, quotes and limits, and scripts/research/cause-activity-year.ts reads both: for Bedford, Wyoming (seed 9a4dd331ace7) and a place drawn from all 56 (named with its seed), three played years of buildBenchWorld, it prints each cause act's share of full adults, times per person and hours per volunteer beside its band, with the lines in the PR body. The engine change that brings the totals into the bands is people-drives-cause-acts-pull-less. **On screen.** Nothing yet: it would show on Politics → Government, and nothing there reads it.

**Files.** src/core2/modules/drives.ts, src/core2/data/drives.json

**Notes.** Filed Oct 25 by the speed lead, replacing the owner question on how often a person with a cause acts (asked in the speed channel Oct 24; the Oct 24 standing ruling says to simulate it from research instead). Counts from scratchpad drive-years.mts (drivesReport and core.memberships at each year's end).

Done when amended Oct 25 by the speed lead before the PR, as the researcher skill says: research records the bands and the report that reads them; the drives engine change goes to the area's builder (people-drives-cause-acts-pull-less).

Ready Oct 25 (speed lead), not opened while the play-first freeze holds: branch `claude/cause-activity-research` at 883d194094. Two research files: `data/research/people/cev-2017-2023-national-rates.json` (AmeriCorps and the Census Bureau, CEV national rates of all measures, data.americorps.gov view rhng-qtzw) and `census-2024-cev-volunteer-hours.json` (median 24 and mean 70 hours per formal volunteer in 2023, 40 and 96.5 in 2017). `scripts/research/cause-activity-year.ts` reads both. Bedford, Wyoming (seed 9a4dd331ace7), year three: 63 of 1,643 full adults volunteer for a cause (3.8 percent, against 23.2 to 30.3), 187 times each, median 408 hours; 44 donate (2.7 percent, against 7.0 to 9.4 for a political cause), 241 times each; 61 approach an office (3.7 percent, against 8.7 to 11.4), 19 times each; 115 belong to a group (7.0 percent, against 23.8 to 27.1). Earl Park, Indiana (key 1819450, drawn by seed 991acaa254a988f5), year three: 45 volunteer (2.6 percent), 118 times each, median 283 hours; 69 donate (4.0 percent), 168 times each; 149 belong to a group (8.6 percent). In both, too few people act and each acts far too often; people-drives-cause-acts-pull-less carries the engine change. The reader guard fails on main the same way, on 11 files of others (release-red-research-reader-census-rerun); these two files are read.

Oct 25 (CTO ruling): this calibration is the band for how often a cause-holder acts; the speed lead ships people-drives-cause-acts-pull-less against it. No owner question.

Sent back 2026-10-25 from PR #6077 (branch claude/cause-activity-research): report treats unlike activities and age populations as calibrated bands: meeting organizing vs attendance, cause-only volunteering vs all volunteering, annual joins vs membership prevalence, 18+ vs source16+; finish on that branch, merge main into it first.

Oct 25, after the send-back (speed lead, same branch, #6077): each survey measure is broader than the game act it sits beside (any organization, not only causes; attending a meeting, not organizing one; belonging to any group, not joining one this year), so the report now prints it as the nearest survey measure with how the two differ, and draws no in-band or out-of-band conclusion. The town's people are counted from age 16, the survey's universe, in the numerators and denominators alike. The sourced data is unchanged.

Sent back 2026-10-26 from PR #6077 (branch claude/cause-activity-research): corrective report still includes15-year-olds in claimed16+ universe by subtracting years only; use birthday-aware age, and remove remaining unsupported upper-bound/broader-set claims for nonnested donations and selected full-person sample while retaining neutral proxy report; finish on that branch, merge main into it first.
