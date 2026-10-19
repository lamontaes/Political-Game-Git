---
id: world-opening-jobs-vs-lodes-commuting
title: "Towns where most employed residents work outside their county open with no unplaced workers (Elk Creek, Nebraska 74 percent; Chimney Hill, Vermont 41 percent)"
area: world
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The Census LODES8 tables (src/core2/data/laws/lodes-commutes.json, built by src/core2/tooling/build-lodes-commutes.ts: 3,143 counties, 147 million workers, 52.7 percent working in the county they live in) say how many of a county's resident workers work somewhere else. In six drawn places the opening's unplaced workers (the employment target less recorded jobs) do not follow that: Elk Creek, Nebraska (county 31097, 74.4 percent of resident workers work outside the county) and Chimney Hill, Vermont (50025, 41.4 percent) open with no unplaced workers at all, while Woxall, Pennsylvania (42091, 53.8 percent) has 371 and Clinton, Connecticut (09007, 70.5 percent) 1,065. Find why the town's recorded jobs fill the employment target in the first two (the town's firms may be staffed by residents who in life commute out), and have the opening place only the residents who really work in the town, so commuters are unplaced.

**Rules.** Research before building: LODES calibrates the share and never decides one worker's job. One rule, all 56 places: the county comes from place data. No dice. Estimate, never UNKNOWN: a territory LODES does not cover starts from the national share, marked ESTIMATED.

**Done when.** In a drawn place (buildBenchWorld, name and seed in the PR body), the share of employed residents the opening places in town jobs is within the sourced spread of LODES's in-county share for the place's county, shown by the opening's job and unplaced counts, and a test in src/core2 says so.

**Files.** src/core2/opening-employment.ts, src/core2/residents.ts, src/core2/data/laws/lodes-commutes.json

**Notes.** Found Oct 19 (claude/peaceful-ritchie-03780x) building the LODES table for world-lodes-commutes. The comparison script measured recorded counted jobs, full jobs and unplaced workers per place; the county is lawChain(api).countyGeoids[0]. The town is smaller than its county, so LODES's county share is an upper bound for the town's in-town share, which is why zero unplaced workers in a 74 percent out-commuting county is the thing to explain. Nothing reads lodes-commutes.json yet; this item is its reader.
