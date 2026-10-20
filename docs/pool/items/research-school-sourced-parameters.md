---
id: research-school-sourced-parameters
title: "Research: sourced parameters for school assignment and school days"
area: people
kind: research
priority: 2
size: M
status: in-pr
claimed-by: claude/school-days-by-state
pr: #5414
blocked-on:
source: "collapsed Oct 19, 2026 from people-stopgap-opening-schools-estimated-behavior, people-stopgap-school-behavior"
claimed-at: 2026-10-20T02:15:10.016Z
---

**What.** Source the numbers behind school assignment and school days. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 2 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/people/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-P15-school-assignment` in src/core2/data/opening-schools.json: Each child's school is a seeded pick among the public schools teaching their entry grade in their place, else in their county and its places, else (for places the county geography does not cover: the territories and Puerto Rico) in their state or territory, weighted by students per grade and shared by children who live together. Replacement: NCES EDGE school attendance boundaries (SABS) with the household's location, private school (PSS) and homeschool shares by state, and historical CCD directories for each cohort's years.
- `SG-CORE-school-days` in src/core2/modules/school.ts: Every school-age full person attends the town's public school district (or, in a world opened without it, their town's schools as a place) on the weekdays of one national school calendar (Sept. Replacement: PEOPLE's schools engine: each child's enrolled school (opening-schools), its district calendar and hours, classes with classmates and teachers, and attendance that state law and family circumstances shape.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/opening-schools.json, src/core2/modules/school.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/people/

**Notes.** Folded from: people-stopgap-opening-schools-estimated-behavior, people-stopgap-school-behavior. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.
