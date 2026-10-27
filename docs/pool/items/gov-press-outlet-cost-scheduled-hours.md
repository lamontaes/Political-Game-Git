---
id: gov-press-outlet-cost-scheduled-hours
title: "An outlet's monthly cost reads a 40-hour year, so a reporter scheduled longer drains its cash and a radio station closes at Washington, D.C.'s Census size"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/press-cost-schedule
pr: #5996
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T07:38:22.931Z
---

**What.** The press engine sizes an outlet's monthly cost, which the wider audience's weekly payment covers, from each of its head's and reporters' current jobs at a 40-hour year (fullTimeHoursPerYear). In Washington, D.C. (seed dc-closures-a) a radio station's one reporter is scheduled 56 hours a week and paid 221,088 every two weeks, so in months the reporter works every scheduled day the station spends about 45,000 more than it takes in. At the Census size the reporter worked them all and the station closed on December 8, 2025 with its cash and credit exhausted, while at the sample size the reporter missed days and it stayed open.

**Rules.** Wire to the world: the cost an outlet is paid against must be what its payroll and wage flows actually pay. One model, two tiers: counted staff count at the jobs they stand for. No dice: the shortfall payment follows the outlet's own staff and schedule.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place, src/core2/press-money.test.ts checks that every local outlet's monthly cost covers its staff's scheduled pay, and in Washington, D.C. at its Census size (seed dc-closures-a) organization:press:radio:1:jurisdiction_7691c6e3ae48f824 stays open through the year, named by record id in the PR body.

**Files.** src/core2/modules/press.ts,src/core2/data/press/parameters.json,src/core2/press-money.test.ts

**Notes.** Found working world-census-scale-closures-large-cities (#5803): after main merged, the pinned D.C. comparison closed this station at the Census size only.
