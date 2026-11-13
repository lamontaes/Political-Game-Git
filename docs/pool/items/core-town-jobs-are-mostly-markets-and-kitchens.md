---
id: core-town-jobs-are-mostly-markets-and-kitchens
title: 'A new life''s town offers almost only market and kitchen jobs, and people placed nowhere show as "works outside the town"'
area: core
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/jobs-real-town-work
pr: #8942
after:
blocked-on:
lead: jobs
model: opus
effort: medium
root: none
source: added with npm run pool -- add
claimed-at: 2026-11-12T20:19:20.016Z
---

**What.** Seen: the jobs a player meets in the first weeks. Owner, Nov 12, 2026, life 1 in Wofford Heights, California (seed a9c85de3-e7fa-4418-8499-569a5c5e6e10): "it's only the market and like craft shops. Why are there no real jobs?" The player was a stocker at Sullivan's Market, and a housemate "works outside the town". Seen: the Jobs screen, a person's card and talk at home name jobs from many kinds of workplace

**Cause.** Measured: Nov 12 by the Jobs builder (opus-3ab1) with `node --import tsx scripts/dev-tests/town-jobs-mix.ts`, in Wofford Heights, California and three drawn towns (Kinsley, Kansas; Lemont Furnace, Pennsylvania; Rockwell City, Iowa; table on issue 7365). (1) A hospital, clinic or bank entered a town only under a sourced institution's name (`src/core2/opening-town-jobs.ts`, `sourcedTownInstitution`), and none of the four had one, so the county's health and banking jobs (12 to 20 percent) had no workplace. (2) The opening fill then gave each such resident to whichever kind was next in line by shortfall (`fillTownJobs`), the biggest kinds, so stores, kitchens and warehouses held 1.5 to 2.5 times their county share. (3) A filled-in resident the town did not place got `startCommuterJob`'s fill-in title "Works outside the town" under the employer "Buyers and sellers outside the town" (`src/core2/modules/residents.ts`): 9 to 14 of the people a player meets in each town. (4) The world opened with no open positions; the first came at the March 1 review (`reviewEmployers`, `src/core2/modules/jobs.ts`) and waited out their industry's vacancy duration, so nobody could be offered a job in the first six weeks.

**Fix.** (1) A clinic with no sourced record is named by the naming system like any other employer; a hospital and a bank stay sourced-only, and in a town without one their share goes to the other workplaces of their sector (clinic and care home; insurance) or, with none, to every kind in proportion (`writableTownWeights`). (2) A commuter's job takes the county role furthest below its share among the place's commuters (`commuterRole`), and a regional hire takes the role it was priced from; a card names no employer for work outside the town. (3) At the opening every employer posts its standing openings, its staff times its industry's JOLTS openings rate (`src/core2/data/jobs/openings-rate.json` (new), SOURCED), opened on days spread back across the industry's wait (`postStandingOpenings`).

**Time box.** 2 hours

**Rules.** One rule, all 56 places. No dice. Estimate, never UNKNOWN. This is a game, not a spreadsheet: the fix changes what jobs a town shows, it adds no step for the player.

**Done when.** A second session starts three new lives in drawn places and, on the Jobs screen and in talk at home, meets jobs from at least five kinds of workplace across the household and the openings, with no job shown as "works outside the town".

**Waits on.** Nothing

**Files.** src/core2/town-workplaces.ts, src/core2/town-employment-mix.ts, src/core2/opening-town-jobs.ts, src/core2/modules/residents.ts
