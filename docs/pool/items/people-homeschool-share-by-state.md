---
id: people-homeschool-share-by-state
title: "Source the homeschool share of school-age children by state and read it where private share is read"
area: people
kind: research
priority: 3
size: S
status: open
claimed-by:
pr: #5493
blocked-on: a researcher: choose the homeschool definition (Household Pulse is broader than NHES), then build the state table from the Pulse public-use files; see the Notes
source: added with npm run pool -- add
claimed-at:
---

**What.** The private share of students by state is sourced (NCES, PR for research-school-assignment-sources); the homeschool share by state is not. The Census Bureau's Household Pulse surveys report homeschooling by state, but the Census data service needs a key the session did not have. Source it with a year, a unit and a spread into data/research/people/ with a reader, and the five territories take the median.

**Rules.** Research before building: a share calibrates the band the proof reports, never the chance one family homeschools. Estimate, never UNKNOWN: a state the source lacks starts from the median, marked ESTIMATED.

**Done when.** A research file lists each state's homeschool share with its source and year, a reader in the school engine uses it, and the research-data guard in tests/guards passes with the file named; a played world in a drawn place reports the share it used.

**Files.** data/research/people, src/core2/opening-private-tuition.ts

**Notes.** TODO

Oct 20 (claude, claude/homeschool-share-note): researched, not shipped. The Household Pulse public-use files download without a Census API key (www2.census.gov, 2022 weeks 41 to 48), so the key was not the real blocker. The Pulse homeschool level is 14.4 percent of enrolled children, about five times NCES's own 2.8 percent for 2019 (Digest 2022 Table 206.10), so the state share here is the NHES national figure scaled by each state's shrunk Pulse share relative to the nation, 1.8 to 4.4 percent with a median of 2.6. The definition, the table of 51 states, the script and the limits are in docs/reports/homeschool-share-2026-10-20.md. The data file is not added because research-data-has-reader would fail: the school engine reads one national private share, not a state-level one, and the state-level private share the item refers to (research-school-assignment-sources) is not on main. Next step for a researcher: after that lands, move the table into data/research/people with the reader, tag the territories with the median as ESTIMATED, and report the share a played town used.

Sent back 2026-10-20 from PR #5493 (branch claude/political-game-pool-yucp92-ll): The base PR #5428 is merged, so I retargeted this PR to main. Merging current main conflicts in src/core2/opening-private-tuition.ts and src/core2/opening-private-tuition.test.ts. Resolve both code conflicts on this branch, retaining the sourced per-state data and an ordinary drawn-world tuition proof, then rerun the changed-file gate.; finish on that branch, merge main into it first.
