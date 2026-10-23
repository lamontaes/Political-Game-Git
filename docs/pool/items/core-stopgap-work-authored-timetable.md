---
id: core-stopgap-work-authored-timetable
title: "Stopgaps in work (authored-timetable): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/work.json, kind authored-timetable"
claimed-at:
after:
---

**What.** Every working week in the game comes from seven authored patterns in src/core2/data/work.json (office, farm, clergy, retail, service-evening, care-night, fire-cycle), picked by seven workplace prefixes with a fallback to office, and from the GAME ASSUMPTION table in src/core2/work-patterns.ts; shifts, rotation, part-time shortening and holidays are not observed. Replace them with source-backed schedules matched by occupation: the start minute, length and weekdays of a job's shift come from the BLS American Time Use Survey hour-of-day table for its occupation group (Table A-4, pooled 2021 to 2025) and the BLS job flexibilities and work schedules shares, kept as sourced rows in the parameter table with their spread. Within an employer, which worker takes which shift is the roster rule that world-port-work-schedules-roster built, with a worker's own constraints on top (a parent whose child needs care, read from `careNeedOf` and the household, leans to day shifts), and holidays are read from the legal-holiday law rows in force where the employer is, not a list in work.json. Delete the pattern table, the prefix map and the `SG-P8-work-schedule-data` marker in `work-state.ts` when done.

**Rules.** One rule, all 56 places: schedules are data keyed by occupation and industry, never by place, and holidays come from each place's law rows. Estimate, never UNKNOWN: an occupation with no published hour-of-day row takes its group's average, marked ESTIMATED with its source and spread. No dice: who works nights follows the roster, the worker's care duties and need for pay, never a roll. Replace, never layer: the authored patterns and `work-patterns.ts` are deleted when the sourced schedules replace them. One model, two tiers: counted workers' hours follow the same occupation schedule times their count. An effect is a read, not a record: payroll, free time and the commute must read the commitment's slots. Numbers in the parameter table are SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), a kitchen cook and an office clerk of the same town carry different shift hours that match their occupation's sourced distribution within its spread, a parent with a child in recorded care need works the day shift where the roster offers one, a legal holiday from the law rows removes that day's work commitment, and payroll pays the minutes of those commitments by work commitment record id; src/core2/work-schedule-sourced.test.ts proves it, work.json no longer holds `patterns` or `stopgapId`, and the row is resolved in stopgaps.json.

**Files.** src/core2/data/work.json, src/core2/work-patterns.ts, src/core2/work-state.ts, src/core2/opening-work.ts, src/core2/data/parameters.json, src/core2/work-schedule-sourced.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Imports existing generated timetable assumptions or explicitly tunable fallback placement.

Oct 20 (pool feeder): spec written; the sources are named in docs/research/stand-in-figures-2026-10-12.md (ATUS Table A-4, job flexibilities) and need to be fetched into data/research/core/ by the builder (bls.gov returned 403 from cloud on Oct 20; use the ATUS microdata or a mirrored table and cite it). The roster rule is already built (world-port-work-schedules-roster).
