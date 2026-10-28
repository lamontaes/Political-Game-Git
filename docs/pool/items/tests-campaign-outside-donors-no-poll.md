---
id: tests-campaign-outside-donors-no-poll
title: "campaign-outside-donors.test.ts is red on clean main: a state official's Senate campaign in Strasburg, North Dakota raises but buys no poll in 360 days"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/campaign-outside-donors.test.ts fails on clean main with GOLDEN_PATH_SEED=pet-run-1 (Oct 28, 21:05 UTC). In Strasburg, North Dakota (3876500), place seed 273562d7baee41cdcec1eb38d32cc89d442587e61b63a699457dcb3bdc5b2cf1, the candidate person:cabinet:US-ND:budget files for the 2030 U.S. Senate race and runs 120 campaign turns three days apart. The test's last check fails: no poll is bought (polls 0). The race is five years out, so the campaign may hold its money for later, or the poll purchase may wait for a window the test never reaches; the cause is not traced yet.

**Rules.** Never weaken a test to get green: find why a funded statewide campaign buys no poll before changing the race the test picks or its turns. One rule, all 56 places: the test draws from all 56 places and names those it passes over.

**Done when.** The outside donors test passes on ten fresh GOLDEN_PATH_SEED draws in the played world (buildBenchWorld), each naming the place, seed and the poll record id, and the PR names the cause by file and line.

**Files.** src/core2/campaign-outside-donors.test.ts,src/core2/modules/campaigns.ts

**Notes.** lead: elections. Found by the elections wire session while running the petition line's tests; identical on clean main with the vacant-seat fix.
