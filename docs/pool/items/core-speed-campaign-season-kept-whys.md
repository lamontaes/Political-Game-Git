---
id: core-speed-campaign-season-kept-whys
title: "In campaign season a town keeps 17,000 campaign 'why' rows and 16,000 weighed-decision records a month, and the month before the election takes 16 s (Bedford: 2 to 3 s in year one)"
area: core
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/speed-campaign-kept-whys
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T20:22:24.880Z
---

**What.** In Bedford, Wyoming (key 5606045, seed 9a4dd331ace7), on main with the drives change (branch claude/drives-cause-acts-pull-less), month by month with the live heap after a full collection: year one's months run 2 to 4.6 s. From month 15 (spring 2026) the campaigns module's causes table grows by 1,110 rows a month, rising to 17,659 in month 21, and the kept log gains person.weighed records (104 in month 14, 15,939 in month 21). Month 21 takes 7.4 s and month 22 (to November 11, 2026, the election) 16.4 s; the kept log goes from 13,076 records to 79,742 in eight months. Two rules keep them. keepCause in src/core2/modules/campaigns.ts saves a voter's cause row when keepsWhy(voter, candidate) holds, so every voter a candidate the player merely knows reaches gets a kept row. keepWeighing in src/core2/trait-decisions.ts keeps a person.weighed record for every two-way decision a focus person weighs. Keep the why only where it is read (the player's own circle, the player's own race), and price the rest by count.

**Rules.** Keep it simple (owner, Oct 11): why records only for the player and the people they deal with; bookkeeping keeps everything in tests. Speed: never keep a whole history daily; a later year within 1.2 times the first. Replace, never layer.

**Done when.** In the played world (buildBenchWorld), Bedford, Wyoming (seed 9a4dd331ace7, key 5606045) and a place drawn from all 56 (named with its seed), two played years: the campaign month before the election runs within 1.5 times an ordinary month, the kept log and the causes table grow by the counts the PR names, every screen that reads a cause row or a person.weighed record still finds the player's and their circle's (a test names the record ids), and the deep fingerprint differs only in those kept rows.

**Files.** src/core2/modules/campaigns.ts, src/core2/trait-decisions.ts, src/core2/why-kept.ts

**Notes.** Filed Oct 25 by the speed lead from a month-by-month run (scratch heap-months.mts). Related: core-speed-contact-offers-grow-with-ties (the focus set's growth), core-speed-opelika-year-memory-growth.
