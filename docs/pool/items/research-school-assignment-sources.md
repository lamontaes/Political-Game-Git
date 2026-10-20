---
id: research-school-assignment-sources
title: "Source school assignment: attendance boundaries, private and homeschool shares by state"
area: people
kind: research
priority: 2
size: M
status: open
claimed-by:
pr: #5428
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** SG-P15-school-assignment still places each child by a seeded pick among the schools teaching their entry grade in their place, county or state, weighted by students per grade. The replacement reads NCES school attendance boundaries (SABS) with the household's location, and private (PSS) and homeschool shares by state. Source the private and homeschool shares by state with a year, a unit and a spread, and record them in data/research/people/ with a reader; the boundary lookup needs household locations and is left to the builder.

**Rules.** Research before building: a sourced share calibrates the band the proof reports, never the chance one child goes private. Estimate, never UNKNOWN: a state the source lacks starts from the national share with a spread. One rule, all 56 places: shares are a per-state table in data, never a state named in logic.

**Done when.** Each state's private and homeschool share is SOURCED or ESTIMATED in a data file under data/research/people/ with a citation (publisher, year, URL) and a spread, read by the school assignment code, the research-data-reader guard in tests/guards is green, and a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed in the PR body) reports the town's private and homeschool share against the state's.

**Files.** src/core2/data/opening-schools.json, data/research/people/, src/core2/data/stopgaps.json

**Notes.** TODO
