---
id: research-residents-sourced-parameters
title: "Research: sourced parameters for residents' cadence, district placement and employment"
area: people
kind: research
priority: 2
size: M
status: claimed
claimed-by: claude/residents-sourced
pr:
blocked-on: researcher: per-place or calibration sourcing, each row cited; first row's replacement: Valid county B23001 civilian employed/resident-age observations, suppression/MOE handling and territorial equivalents. (parameter
source: "collapsed Oct 19, 2026 from people-stopgap-resident-employment-missing-local-observation, people-stopgap-residents-aggregate-cadence, people-stopgap-residents-assumed-data"
claimed-at: 2026-10-20T13:18:06.144Z
---

**What.** Source the numbers behind residents' cadence, district placement and employment. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 3 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/people/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-P8-resident-employment-proxy` in src/core2/data/resident-employment.json: Uses national pre-opening CPS age ratios and a tunable local scale when actual county ACS cells are unavailable. Replacement: Valid county B23001 civilian employed/resident-age observations, suppression/MOE handling and territorial equivalents. (parameter rows: src/core2/data/parameters.json:openingMissingCountyEmploymentScale)
- `SG-CORE-residents-cadence` in src/core2/residents.ts: The wider population's purchases are merged per seller, kind and week of the month and paid monthly instead of after each household's own paydays; count workers always work their full schedule and are paid on the employer's cadence (semimonthly approximated as two monthly dates). Replacement: Wider-population spending timed from the counts' pay dates and income, with absence and turnover rates by industry checked against BLS JOLTS and CPS.
- `SG-CORE-district-placement` in src/core2/modules/residents.ts: A town split between state legislative districts places its counted households into the districts by income order, filling each district in proportion to its Census population in the town, so each district holds a slice of the town's income ladder. Replacement: Each district's own Census tables (ACS by state legislative district: income, tenure, age) and its election results, so households are placed by the district's real mix.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/resident-employment.json, src/core2/modules/residents.ts, src/core2/residents.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/people/

**Notes.** Folded from: people-stopgap-resident-employment-missing-local-observation, people-stopgap-residents-aggregate-cadence, people-stopgap-residents-assumed-data. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.
