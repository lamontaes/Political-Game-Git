---
id: research-school-assignment-sources
title: "Source school assignment: attendance boundaries, private and homeschool shares by state"
area: people
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** SG-P15-school-assignment still places each child by a seeded pick among the schools teaching their entry grade in their place, county or state, weighted by students per grade. The replacement reads NCES school attendance boundaries (SABS) with the household's location, and private (PSS) and homeschool shares by state. Source the private and homeschool shares by state with a year, a unit and a spread, and record them in data/research/people/ with a reader; the boundary lookup needs household locations and is left to the builder.

**Rules.** Research before building: a sourced share calibrates the band the proof reports, never the chance one child goes private. Estimate, never UNKNOWN: a state the source lacks starts from the national share with a spread. One rule, all 56 places: shares are a per-state table in data, never a state named in logic.

**Done when.** Each state's private and homeschool share is SOURCED or ESTIMATED in a data file under data/research/people/ with a citation (publisher, year, URL) and a spread, read by the school assignment code, the research-data-reader guard in tests/guards is green, and a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed in the PR body) reports the town's private and homeschool share against the state's.

**Files.** src/core2/data/opening-schools.json, data/research/people/, src/core2/data/stopgaps.json

**Notes.** TODO

Partly built Oct 20 (claude/political-game-pool-yucp92-z): the private share by state is sourced from NCES Digest Table 205.80 (private K-12, fall 2021) over that plus Table 203.20 (public, fall 2021), in data/research/people/nces-private-enrollment-share-fall-2021.json (50 states and D.C. SOURCED, from 1.8 to 17.7 percent; the five territories take the 8.9 percent median, ESTIMATED). opening-private-tuition.ts reads it for the town's state, and the national openingPrivateSchoolShare parameter is deleted. Not done: the homeschool share by state (the Census Bureau's Household Pulse surveys have it, but the Census API needs a key this session does not have) and the school-boundary lookup. SG-P15-school-assignment stays open.
