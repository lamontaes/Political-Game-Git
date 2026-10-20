---
id: research-residents-sourced-parameters
title: "Research: sourced parameters for residents' cadence, district placement and employment"
area: people
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from people-stopgap-resident-employment-missing-local-observation, people-stopgap-residents-aggregate-cadence, people-stopgap-residents-assumed-data"
claimed-at:
---

**What.** Apply the rows in docs/research/pool-feeder-oct20/research-residents-sourced-parameters.md to the residents parameter table and resolve the three stopgap rows listed below. Refresh the national employment ratios in resident-employment.json to the current CPS, keep the county scale as a labeled ESTIMATE with its spread, report counted-worker absence and turnover against the BLS rates, and replace strict income-order district filling with the noisy ordering at correlation 0.35. County ACS tables need a free Census key, so the district and county rows stay estimates until a builder with a key reads them.

- `SG-P8-resident-employment-proxy` in src/core2/data/resident-employment.json: Uses national pre-opening CPS age ratios and a tunable local scale when actual county ACS cells are unavailable. Replacement: Valid county B23001 civilian employed/resident-age observations, suppression/MOE handling and territorial equivalents. (parameter rows: src/core2/data/parameters.json:openingMissingCountyEmploymentScale)
- `SG-CORE-residents-cadence` in src/core2/residents.ts: The wider population's purchases are merged per seller, kind and week of the month and paid monthly instead of after each household's own paydays; count workers always work their full schedule and are paid on the employer's cadence (semimonthly approximated as two monthly dates). Replacement: Wider-population spending timed from the counts' pay dates and income, with absence and turnover rates by industry checked against BLS JOLTS and CPS.
- `SG-CORE-district-placement` in src/core2/modules/residents.ts: A town split between state legislative districts places its counted households into the districts by income order, filling each district in proportion to its Census population in the town, so each district holds a slice of the town's income ladder. Replacement: Each district's own Census tables (ACS by state legislative district: income, tenure, age) and its election results, so households are placed by the district's real mix.

**Rules.** Research before building: the sourced figures calibrate the bands the proof reports against and never decide what one person, business or official does. Estimate, never UNKNOWN: any value a source lacks for a place starts from the real national average with a stated spread and is tagged ESTIMATED, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data keyed by place code, and no state, city or GEOID is named in logic. No dice: a real rate may check a town's total after a year, but it must never pick one actor's outcome; if an engine would read a number as a chance, file a bug instead of wiring it.

**Done when.** Each row is tagged SOURCED or ESTIMATED in its parameter table with a citation and spread, the stopgap rows are resolved (or kept with a stated reason) in src/core2/data/stopgaps.json, the research-data-reader guard and the tripwire test pass, and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/resident-employment.json, src/core2/modules/residents.ts, src/core2/residents.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, docs/research/pool-feeder-oct20/research-residents-sourced-parameters.md

**Notes.** Folded from: people-stopgap-resident-employment-missing-local-observation, people-stopgap-residents-aggregate-cadence, people-stopgap-residents-assumed-data. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read. Oct 20 (pool feeder): research done in docs/research/pool-feeder-oct20/research-residents-sourced-parameters.md (3 rows: 1 sourced, 2 estimated, 0 mechanic).
