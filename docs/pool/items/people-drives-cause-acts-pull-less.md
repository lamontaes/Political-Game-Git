---
id: people-drives-cause-acts-pull-less
title: "A person with a cause takes its acts hundreds of times a year: each further act should pull less"
area: people
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/drives-cause-acts-pull-less
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T14:23:59.869Z
---

**What.** In Bedford, Wyoming (key 5606045, seed 9a4dd331ace7) on main 01f5cd4715, the third played year: 63 of 1,643 full adults volunteer for a cause (3.8 percent), 187 sessions each, about 408 hours, where real formal volunteers number 23 to 30 percent of adults and give a median of 24 to 40 hours a year (CEV 2017 to 2023). 44 people donate to a cause 241 times each, and 61 approach an office 19 times each, where 7.0 to 9.4 percent of adults donate to a political cause and 8.7 to 11.4 percent contact an official at least once a year. The drives engine scores the same cause act afresh each day with the same pull, so a holder repeats it near daily, and few people outside the holders ever act. Make each further act of a kind pull less as the holder's time and money go to it and what they gave recently, so the totals land in the bands.

**Rules.** Sliding scales and causes: no cap, cooldown or fixed interval; the pull of a further act falls on a sliding scale with what the holder already gave of their time and money. No dice: the bands check the town's totals and never become a chance; each act stays the holder's own scored choice. Speed: no change makes a year slower than its base.

**Done when.** In the played world (buildBenchWorld), scripts/research/cause-activity-year.ts on Bedford, Wyoming (seed 9a4dd331ace7, key 5606045) and on a place drawn from all 56 (named with its seed), three played years, prints each act's share of adults and hours per volunteer inside or nearer the CEV bands than on main, with the before and after lines in the PR body; and Bedford's third year runs within 1.2 times its first on one process (speed-year-three-within-band).

**Files.** src/core2/modules/drives.ts, src/core2/data/drives.json, scripts/research/cause-activity-year.ts

**Notes.** Filed Oct 25 by the speed lead from the research in people-cause-holder-activity-calibrated (bands: data/research/people/cev-2017-2023-national-rates.json and census-2024-cev-volunteer-hours.json). The tried Oct 18 repeat interval in core-later-years-slower-drive-holders-offers was a fixed interval, which the sliding-scales rule rules out.

Build after #5994 (people-drives-responses-against-research-bands) lands: it changes src/core2/modules/drives.ts by 139 lines (speed lead, Oct 25).

Oct 25, 15:15 UTC (speed lead): built on `claude/drives-cause-acts-pull-less` (on #5994's head dc7d294040, so it lands after #5994; no PR while the play-first freeze holds). Each giving act (share, join, donate, volunteer) adds one to what the person has lately given of its kind, fading over `causeGivenDays` (30; joining over `causeJoinedDays`, 365), and that total weighs against a further act of the same kind through `causeGivenWeight` (1), a reason bound in `drives.json`. Third year, before and after, `scripts/research/cause-activity-year.ts` (from the research branch): Bedford, Wyoming (seed 9a4dd331ace7) hours per volunteer median 344 to 33 (band 24 to 40), donations per donor 206 to 25, shares per person 146 to 20, groups joined per joiner 11.9 to 1.9, memberships 1,951 to 574. Earl Park, Indiana (drawn, seed 991acaa254a988f5): hours median 246 to 35, donations 178 to 25, joins 10.5 to 2.1. Not met: the share of adults who act stays where it was or falls (Bedford volunteers 3.8 to 3.3 percent against 23 to 30; organizers 2.4 to 0.5 percent), because only cause holders take these acts and few people hold a cause; and the third year still runs about twice the first (Bedford 34 to 42 s, then 71 to 81 s), because each day's choice scores one contact offer per person known, which group ties keep growing (filed as `core-speed-contact-offers-grow-with-ties`). Proposed for the CTO: amend this item's done-when to the per-person rates and hours (met), and leave the shares to a drive-formation item and the band to the contact-offers item.
