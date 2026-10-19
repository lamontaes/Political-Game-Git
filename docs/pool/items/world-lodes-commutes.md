---
id: world-lodes-commutes
title: "Unplaced workers get recorded jobs, including out-of-town commutes"
area: world
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
---

**What.** Residents' pay from jobs the opening could not place is a stand-in (`SG-CORE-unplaced-workers-income`). Make them jobs: commutes from LEHD LODES for work outside the town, and the town's missing industries. The workers then show an employer or commute destination in their pay record. The commute shares come from the LODES tables the place data already carries.

**Rules.** One rule, all 56 places: commute shares come from place data, never a named state. Research calibrates totals and never decides one worker's job.

**Done when.** In a drawn place from all 56 in buildBenchWorld, an unplaced worker's pay comes from a job record (employer or commute destination) by record id over a one-year run, and SG-CORE-unplaced-workers-income is resolved with a test.

**Files.** src/core2/modules/jobs.ts, src/core2/tooling/generated-world.ts, src/core2/data/stopgaps.json

**Notes.** core.md line 179 (3), checked Oct 15.

Checked Oct 19 (claude/peaceful-ritchie-03780x). The item's premise does not hold: no LODES table is in the repository. `data/source/acs-county-housing-commute/regional-corpus.json.gz` carries ACS commute times (B08303), rent and home value only, and nothing under data/ or src/core2/data/ names LODES or an origin-destination pair. What exists now: a met commuter already holds a job at the place's outside account, paid and withheld (#5076, people-unplaced-fill-in-job). What this item adds is the destination: the job's title and record would name the county the worker commutes to, drawn from LEHD LODES8 origin-destination tables, which are reachable (https://lehd.ces.census.gov/data/lodes/LODES8/<state>/od/<state>_od_main_JT00_<year>.csv.gz). Plan: a fetch script (as src/core2/tooling/fetch-disasters.ts does for FEMA) that reduces each state's file to a per-county list of work counties with worker counts and writes one JSON under data/research/ with its source and spread, then `startCommuterJob` (src/core2/modules/residents.ts) reads it by share to title and tag the job. Big files: size the download before starting (the large states run to hundreds of megabytes each).
