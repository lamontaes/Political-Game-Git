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

Oct 25, 21:00 UTC (speed lead): re-measured on main a351e12f45, Bedford month by month. The election month (to November 11, 2026) takes 17.0 s against 2.3 s for an ordinary month, but the kept whys are no longer most of it. Profiled, month 22 runs 22.6 s against month 13's 2.6 s, and 7.75 s of the growth is the world races (`decide` in `world-races.ts`): 582 races elsewhere decided that month (438 House, 34 Senate, 35 governors, 75 state legislative), 5,138 places in all, each counted against the town's coarse sample of 400 voters (`coarseSampleVoters`), so about 2 million appeal and turnout evaluations. That cost does not depend on the town's size. The kept-why part found so far: `keepWeighing` writes a new identical record every time a candidate's party firmness is read for a voter, and finds each id by trying suffixes one by one. On `claude/speed-campaign-kept-whys` one record per score per day cuts Bedford's month 22 from 18,468 weighed records to 13,634, but not its seconds; in Sarasota, Florida's third year the suffix search alone was 9.5 s. Next: whether the world races can be counted more coarsely (a gov design call: the sample size, or House races counted by state), and keepCause kept only for the player's own races (the only reader is the campaign screen, for contests the player filed in).
