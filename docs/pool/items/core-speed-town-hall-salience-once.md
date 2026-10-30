---
id: core-speed-town-hall-salience-once
title: "A town hall weighs each adult's questions inside every sort comparison (about 8 s of Grand Haven, Michigan's year)"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: speed/townhall-salience-once
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T02:01:10.148Z
---

**What.** A CPU profile of the played year in Grand Haven, Michigan (key 2633340, speed:year seed spd-d, main 923bfbf3, 162 s a year) puts townHallDrives in src/core2/modules/meetings.ts at 13.8 s of 223 s under the profiler, nearly all of it in viewOn, openingRecord and stanceOn. For every adult in town it sorts the policy questions with a comparator that recomputes the adult's salience (the view on the question times a life-concern weight) twice per comparison, so each question's view is worked out many times instead of once. Two independent analyses in the speed lead's hot-spot workflow found the same cut.

**Rules.** Speed: a country's year runs under 120 seconds, and no change makes it more than 20 percent slower. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place. One rule, all 56 places: the check names its place and seed.

**Done when.** npm run speed:year -- --seed spd-d in Grand Haven, Michigan, alternating main and the branch twice on one machine, shows the year faster on the branch, with dev mode's records proof (the receipts' fingerprint) identical between main and the branch in every run; the PR body gives both times and the digest.

**Files.** src/core2/modules/meetings.ts

**Notes.** TODO
