---
id: world-lodes-commutes
title: "Unplaced workers get recorded jobs, including out-of-town commutes"
area: world
kind: wiring
priority: 2
size: M
status: blocked
claimed-by: claude/pool-lodes
pr:
blocked-on: world-commute-flow-data
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-19T23:48:30.718Z
---

**What.** Residents' pay from jobs the opening could not place is a stand-in (`SG-CORE-unplaced-workers-income`). Make them jobs: commutes from LEHD LODES for work outside the town, and the town's missing industries. The workers then show an employer or commute destination in their pay record. The commute shares come from the LODES tables the place data already carries.

**Rules.** One rule, all 56 places: commute shares come from place data, never a named state. Research calibrates totals and never decides one worker's job.

**Done when.** In a drawn place from all 56 in buildBenchWorld, an unplaced worker's pay comes from a job record (employer or commute destination) by record id over a one-year run, and SG-CORE-unplaced-workers-income is resolved with a test.

**Files.** src/core2/modules/jobs.ts, src/core2/tooling/generated-world.ts, src/core2/data/stopgaps.json

**Notes.** core.md line 179 (3), checked Oct 15.

<<<<<<< HEAD
Checked Oct 19 (claude/peaceful-ritchie-03780x). The item's premise does not hold: no LODES table is in the repository. `data/source/acs-county-housing-commute/regional-corpus.json.gz` carries ACS commute times (B08303), rent and home value only, and nothing under data/ or src/core2/data/ names LODES or an origin-destination pair. What exists now: a met commuter already holds a job at the place's outside account, paid and withheld (#5076, people-unplaced-fill-in-job). What this item adds is the destination: the job's title and record would name the county the worker commutes to, drawn from LEHD LODES8 origin-destination tables, which are reachable (https://lehd.ces.census.gov/data/lodes/LODES8/<state>/od/<state>_od_main_JT00_<year>.csv.gz). Plan: a fetch script (as src/core2/tooling/fetch-disasters.ts does for FEMA) that reduces each state's file to a per-county list of work counties with worker counts and writes one JSON under data/research/ with its source and spread, then `startCommuterJob` (src/core2/modules/residents.ts) reads it by share to title and tag the job. Big files: size the download before starting (the large states run to hundreds of megabytes each).

Conflict to settle before building (Oct 19, claude): the done-when asks that "an unplaced worker's pay comes from a job record", but AGENTS.md "Keep it simple" makes everyone not met a count, filled in as a full person only when the player meets them. After #5076 that already holds for every met commuter (a job at the place's outside account) and the counted tier's share is one taxed place-level flow. Giving each counted commuter an individual job record would put them on the full-person books. So the part left here is only the destination (which county a met commuter works in) and it needs a reader to count: the English engine or a screen reading a destination field on the job. Without a reader it would be a record nobody reads, which the "an effect is a read" rule calls an unregistered placeholder. Suggest the owner says whether a commute destination is wanted at all; if not, drop this item and keep SG-CORE-unplaced-workers-income as the counted tier's stand-in.

Oct 19 (claude/peaceful-ritchie-03780x): built the data this item said the place data already carried: src/core2/data/laws/lodes-commutes.json (Census LODES8, all jobs, 2022 or the latest year each state publishes; 3,143 counties; each county's resident workers and those who work in that county) from src/core2/tooling/build-lodes-commutes.ts, which streams the 51 states' files. Its first use is a check on the opening: it shows towns that open with no unplaced workers in counties where most residents commute out, filed as world-opening-jobs-vs-lodes-commuting. The destination of each commuter (which county) is not in the file: it keeps only home and same-county counts; a destination table would need the pairs kept, about 6 million rows before reducing to the top few per county.
=======
Checked Oct 18 (claude/lodes-reachable), nothing built. The census LEHD LODES files are reachable from the cloud sessions' network (`https://lehd.ces.census.gov/data/lodes/LODES8/<state>/od/<state>_od_main_JT00_2021.csv.gz` and `<state>/<state>_xwalk.csv.gz` both returned 200; Vermont's pair is 1.7 MB). The crosswalk gives each census block's place (`stplc`), county subdivision (`ctycsub`, the town in New England) and county, so home-to-work flows between places can be summed for every state and D.C. from one OD file and one crosswalk each (about 150 MB for the country, read once by a script; the territories have no LODES and would start from the national figure marked ESTIMATED). The earlier notes that LODES was the blocker for this line should be read with that in mind. What stays hard is the opening side: the unplaced workers are one flow per place (`residents:unplaced-wages:<place>` in `src/core2/residents.ts`) threaded through counted households, fill-in, demotion and law reach (`unplacedWorkers`), so making them recorded commuters with their own employers is a core counted-groups change, not a data one.
>>>>>>> 184750458064a71fd03fcb1940c4d62214229de2
