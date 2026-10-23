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

**What.** A sourced per-place commuting table, so the opening can say how many of a place's residents work elsewhere and how many of its workers live elsewhere. Delivered in #5143: `scripts/source/lodes-commuting.py` reads the Census LEHD LODES8 origin-destination files (all jobs, JT00, main and aux) and each state's block crosswalk, and writes `data/source/lodes-commuting/place-commuting.json` (31,976 place rows of `liveWork`, `liveOut`, `workIn`, with the national average and its 10th to 90th percentile spread for places LODES does not publish), read by `src/core2/commuting-shares.ts` (`commutingSharesOf`).

**Rules.** Research before building: the real flows calibrate the shares and never decide one worker's job. Estimate, never UNKNOWN: a place with no LODES file (Puerto Rico and the four island areas) carries the national average marked ESTIMATED with its spread. One rule, all 56 places: the table is keyed by place id and no logic names a state or town.

**Done when.** The table is in `data/source/lodes-commuting/` with a README naming the LODES vintage per state, the crosswalk, the columns, the places not covered and the table's SHA-256 (`64eb9eeee797f7e7df9d083c9ee53be54373960d579fbb31e7f9476435396a5f`, the checksum contract this source keeps in its README rather than a separate lock file), and `src/core2/commuting-shares.test.ts` reads it for a place drawn from all 56. Done in #5143.

**Files.** data/source/lodes-commuting/, scripts/source/lodes-commuting.py, src/core2/commuting-shares.ts

**Notes.** Split Oct 19 from world-commuters-in-opening. The Census API needs a key, so use the LODES CSV files (https://lehd.ces.census.gov/data/lodes/LODES8/, one state at a time; od main and aux files plus the xwalk). The ACS table B08008 gives only the residents-who-work-elsewhere share per place and could cross-check it.
