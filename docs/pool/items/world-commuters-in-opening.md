---
id: world-commuters-in-opening
title: "Some of the town's workers live in other places, and some residents work elsewhere, in the opening"
area: world
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/commuters-in-opening-s9
pr:
blocked-on:
source: "gov-stopgap-budgets-faked-mechanic, found claiming it"
claimed-at: 2026-10-19T20:20:46.107Z
---

**What.** Checked against main on Oct 16: OPEN. No full worker lives elsewhere and works in the town; the opening only notes that many unplaced workers commute, and the repository holds commute times (ACS B08303) but no commuting flows. Next: Commuting shares per place from flow data. The player would see it as a choice among people, never a form.

**Rules.** One rule, all 56 places: the shares come from commuting data per place, never a named town. One model, two tiers: a counted group commutes by the same rule as a full person, times its count. Estimate, never UNKNOWN: a place without commuting data starts from the real national average marked ESTIMATED with source and spread. No dice: who commutes follows from the jobs and homes the data places, not a roll. Replace, never layer: the all-residents-live-here assumption is deleted where it stood.

**Done when.** A test in src/core2 matches the commuter share to the place's figure within its spread in a drawn place (buildBenchWorld, seed named in the PR body), and a named commuter's paycheck is traced by record id. The owner plays it: Commuting shares per place from flow data.

**Files.** src/core2/opening-employment.ts, src/core2/population.ts, src/core2/data/opening-employment.json

**Notes.** Waits for world-commute-flow-data (the repository holds no commuting flows; split Oct 19). Blocks gov-stopgap-budgets-faked-mechanic (nonresident local tax and tax owed to another state cannot fire without it).

Checked Oct 18 (claude/lodes-reachable), nothing built. The census LEHD LODES files are reachable from the cloud sessions' network (`https://lehd.ces.census.gov/data/lodes/LODES8/<state>/od/<state>_od_main_JT00_2021.csv.gz` and `<state>/<state>_xwalk.csv.gz` both returned 200; Vermont's pair is 1.7 MB). The crosswalk gives each census block's place (`stplc`), county subdivision (`ctycsub`, the town in New England) and county, so home-to-work flows between places can be summed for every state and D.C. from one OD file and one crosswalk each (about 150 MB for the country, read once by a script; the territories have no LODES and would start from the national figure marked ESTIMATED). The earlier notes that LODES was the blocker for this line should be read with that in mind. What stays hard is the opening side: the unplaced workers are one flow per place (`residents:unplaced-wages:<place>` in `src/core2/residents.ts`) threaded through counted households, fill-in, demotion and law reach (`unplacedWorkers`), so making them recorded commuters with their own employers is a core counted-groups change, not a data one.
