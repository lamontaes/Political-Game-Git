---
id: people-homeschool-share-by-state
title: "Source the homeschool share of school-age children by state and read it where private share is read"
area: people
kind: research
priority: 3
size: S
status: in-pr
claimed-by: claude/political-game-pool-yucp92-ll
pr: #5493
blocked-on: a researcher: choose the homeschool definition (Household Pulse is broader than NHES), then build the state table from the Pulse public-use files; see the Notes
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:06:39.897Z
---

**What.** The private share of students by state is sourced (NCES, PR for research-school-assignment-sources); the homeschool share by state is not. The Census Bureau's Household Pulse surveys report homeschooling by state, but the Census data service needs a key the session did not have. Source it with a year, a unit and a spread into data/research/people/ with a reader, and the five territories take the median.

**Rules.** Research before building: a share calibrates the band the proof reports, never the chance one family homeschools. Estimate, never UNKNOWN: a state the source lacks starts from the median, marked ESTIMATED.

**Done when.** A research file lists each state's homeschool share with its source and year, a reader in the school engine uses it, and the research-data guard in tests/guards passes with the file named; a played world in a drawn place reports the share it used.

**Files.** data/research/people, src/core2/opening-private-tuition.ts

**Notes.** TODO
