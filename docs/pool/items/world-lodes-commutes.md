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

Checked Oct 18 (claude/lodes-reachable), nothing built. The census LEHD LODES files are reachable from the cloud sessions' network (`https://lehd.ces.census.gov/data/lodes/LODES8/<state>/od/<state>_od_main_JT00_2021.csv.gz` and `<state>/<state>_xwalk.csv.gz` both returned 200; Vermont's pair is 1.7 MB). The crosswalk gives each census block's place (`stplc`), county subdivision (`ctycsub`, the town in New England) and county, so home-to-work flows between places can be summed for every state and D.C. from one OD file and one crosswalk each (about 150 MB for the country, read once by a script; the territories have no LODES and would start from the national figure marked ESTIMATED). The earlier notes that LODES was the blocker for this line should be read with that in mind. What stays hard is the opening side: the unplaced workers are one flow per place (`residents:unplaced-wages:<place>` in `src/core2/residents.ts`) threaded through counted households, fill-in, demotion and law reach (`unplacedWorkers`), so making them recorded commuters with their own employers is a core counted-groups change, not a data one.
