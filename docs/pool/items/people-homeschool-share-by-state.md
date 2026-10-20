---
id: people-homeschool-share-by-state
title: "Source the homeschool share of school-age children by state and read it where private share is read"
area: people
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The private share of students by state is sourced (NCES, PR for research-school-assignment-sources); the homeschool share by state is not. The Census Bureau's Household Pulse surveys report homeschooling by state, but the Census data service needs a key the session did not have. Source it with a year, a unit and a spread into data/research/people/ with a reader, and the five territories take the median.

**Rules.** Research before building: a share calibrates the band the proof reports, never the chance one family homeschools. Estimate, never UNKNOWN: a state the source lacks starts from the median, marked ESTIMATED.

**Done when.** A research file lists each state's homeschool share with its source and year, a reader in the school engine uses it, and the research-data guard in tests/guards passes with the file named; a played world in a drawn place reports the share it used.

**Files.** data/research/people, src/core2/opening-private-tuition.ts

**Notes.** TODO

Looked at Oct 20 (claude, claude/political-game-pool-yucp92-ee): the state figures exist in the Census Bureau's Household Pulse Survey (2023-24 school year: Alaska 16.2 percent, Tennessee 10.8, Montana 9.0, down to Connecticut 3.0, D.C. 3.0, Massachusetts 3.4, as a Johns Hopkins analysis reports) but the Bureau's tables for them are public-use files by survey week, and the survey's broader definition of homeschooling reads higher than the NCES household survey's (about 6 percent against 2.8 percent nationally). The researcher chooses the definition first (the NHES one is national only), then builds the state table from the Pulse files with their own citation.
