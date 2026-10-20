---
id: world-commute-flow-data
title: "Per-place commuting shares (workers who live in town and work out, and workers who work in town and live out) from LEHD LODES, as sourced data"
area: world
kind: research
priority: 2
size: M
status: done
claimed-by: claude/commute-flow-data-s9
pr: #5143
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T20:21:55.982Z
---

**What.** The repository holds commute times (ACS B08303) but no commuting flows, so the opening cannot say how many of a place's residents work elsewhere or how many of its workers live elsewhere. Build a script that reads the LEHD LODES origin-destination files (public, reachable from the cloud environment) and the block-to-place crosswalk, and writes a sourced per-place table: residents who work in the place, residents who work outside it, and workers in the place who live outside it. Cover all 56 places; a place with no LODES coverage (some territories) starts from the national average marked ESTIMATED with its source and spread.

**Rules.** Research before building: the real flows calibrate the shares and never decide one worker's job. Estimate, never UNKNOWN: a missing place carries the national average with its spread and source. One rule, all 56 places: the table is keyed by place id and no logic names a state or town.

**Done when.** A generated table in data/source (with its lock file and hash like the other sources) lists every one of the 56 places' shares, a test in src/core2 reads it for a place drawn from all 56 (named with its seed) and checks the three shares sum sensibly and sit inside 0 to 1, and a short README names the LODES vintage and the crosswalk used. The owner plays it: nothing yet; it feeds world-commuters-in-opening.

**Files.** data/source/lodes-commuting/, scripts/ (a fetch-and-aggregate script), src/core2/data/opening-employment.json

**Notes.** Split Oct 19 from world-commuters-in-opening. The Census API needs a key, so use the LODES CSV files (https://lehd.ces.census.gov/data/lodes/LODES8/, one state at a time; od main and aux files plus the xwalk). The ACS table B08008 gives only the residents-who-work-elsewhere share per place and could cross-check it.
