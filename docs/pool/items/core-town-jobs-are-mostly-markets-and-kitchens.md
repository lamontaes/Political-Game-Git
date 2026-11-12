---
id: core-town-jobs-are-mostly-markets-and-kitchens
title: 'A new life''s town offers almost only market and kitchen jobs, and people placed nowhere show as "works outside the town"'
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: opus
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** Seen: the jobs a player meets in the first weeks. Owner, Nov 12, 2026, life 1 in Wofford Heights, California (seed a9c85de3-e7fa-4418-8499-569a5c5e6e10): "it's only the market and like craft shops. Why are there no real jobs?" The player was a stocker at Sullivan's Market, and a housemate "works outside the town". Seen: the Jobs screen, a person's card and talk at home name jobs from many kinds of workplace

**Cause.** Needs cause. Read in code, not yet measured in a drawn town: src/core2/town-workplaces.ts gives each kind of workplace one to three outlets, with retail and restaurants at three, and src/core2/town-employment-mix.ts maps a county's sector counts to those few kinds, so store and kitchen names fill what a player sees. A worker the town cannot place gets the fill-in job titled "Works outside the town" at the outside market (src/core2/modules/residents.ts, near line 3696). The measure still owed: in three drawn towns, the share of named jobs by kind of workplace against the county's real share by sector, and the share of filled-in adults holding the fill-in job.

**Fix.** None until the cause is found.

**Time box.** 2 hours

**Rules.** One rule, all 56 places. No dice. Estimate, never UNKNOWN. This is a game, not a spreadsheet: the fix changes what jobs a town shows, it adds no step for the player.

**Done when.** A second session starts three new lives in drawn places and, on the Jobs screen and in talk at home, meets jobs from at least five kinds of workplace across the household and the openings, with no job shown as "works outside the town".

**Waits on.** Nothing

**Files.** src/core2/town-workplaces.ts, src/core2/town-employment-mix.ts, src/core2/opening-town-jobs.ts, src/core2/modules/residents.ts
