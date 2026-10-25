---
id: people-drives-cause-acts-pull-less
title: "A person with a cause takes its acts hundreds of times a year: each further act should pull less"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Bedford, Wyoming (key 5606045, seed 9a4dd331ace7) on main 01f5cd4715, the third played year: 63 of 1,643 full adults volunteer for a cause (3.8 percent), 187 sessions each, about 408 hours, where real formal volunteers number 23 to 30 percent of adults and give a median of 24 to 40 hours a year (CEV 2017 to 2023). 44 people donate to a cause 241 times each, and 61 approach an office 19 times each, where 7.0 to 9.4 percent of adults donate to a political cause and 8.7 to 11.4 percent contact an official at least once a year. The drives engine scores the same cause act afresh each day with the same pull, so a holder repeats it near daily, and few people outside the holders ever act. Make each further act of a kind pull less as the holder's time and money go to it and what they gave recently, so the totals land in the bands.

**Rules.** Sliding scales and causes: no cap, cooldown or fixed interval; the pull of a further act falls on a sliding scale with what the holder already gave of their time and money. No dice: the bands check the town's totals and never become a chance; each act stays the holder's own scored choice. Speed: no change makes a year slower than its base.

**Done when.** scripts/research/cause-activity-year.ts on Bedford, Wyoming (seed 9a4dd331ace7, key 5606045) and on a place drawn from all 56 (named with its seed), three played years, prints each act's share of adults and hours per volunteer inside or nearer the CEV bands than on main, with the before and after lines in the PR body; and Bedford's third year runs within 1.2 times its first on one process (speed-year-three-within-band).

**Files.** src/core2/modules/drives.ts, src/core2/data/drives.json, scripts/research/cause-activity-year.ts

**Notes.** Filed Oct 25 by the speed lead from the research in people-cause-holder-activity-calibrated (bands: data/research/people/cev-2017-2023-national-rates.json and census-2024-cev-volunteer-hours.json). The tried Oct 18 repeat interval in core-later-years-slower-drive-holders-offers was a fixed interval, which the sliding-scales rule rules out.
