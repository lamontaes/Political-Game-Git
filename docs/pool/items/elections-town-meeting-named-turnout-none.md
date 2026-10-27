---
id: elections-town-meeting-named-turnout-none
title: "Golden path M2-07 fails in Troy, Vermont: none of 56 named adults votes in the March town meeting board race"
area: elections
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/voting.test.ts (the accepted golden-path spec M2-07) fails on main at 553bb7e78a with GOLDEN_PATH_SEED=30d6e503a862ff5c84e2be4e6ed63115dfe5582beb4b94fc16ebf8cb4018a7b2 and GOLDEN_PATH_PLACE_KEY=5073450 (Troy, Vermont): 'no noncandidate choice checked against its reasons'. Its race is contest:seat:gus2025:140636:board:0:2026-03-03, a board seat on Town Meeting Day 2026 with three candidates, and none of the 56 named eligible adults casts a ballot. A typical ballot, ballot:contest:seat:gus2025:140636:board:0:2026-03-03:person_15854ff4c6cfc7d6, has a cost of 2.84 against duty 0.07 and interest 0.64, for a turnout propensity of 0.008; another reads 0.006. The off-cycle cost, offCycleTurnoutCost 1.8 in src/core2/data/campaigns/parameters.json, is checked so named off-cycle turnout averages about 25% of eligible adults, so this race falls far outside its own calibration. It turned the golden-path check red twice on #6375 (head 44088842b9), whose diff touches no voting code.

**Rules.** No dice: turnout stays each person's own reasons, never a roll or a floor. Never loosen the test to pass on zero ballots. Ask why: name, by ballot id, the term that puts these voters' propensity under 1%, and fix the cause, not the draw. One rule, all 56 places.

**Done when.** The PR body names the term by ballot id; voting.test.ts passes on that seed and place on main and on two fresh seeds named in the PR body; named turnout in eight random off-cycle races, places and seeds named, stays within the offCycleTurnoutCost parameter's checked range.

**Files.** src/core2/modules/voting.ts, src/core2/data/campaigns/parameters.json, src/core2/voting.test.ts

**Notes.** Found Oct 27 by the laws-and-effects lead while checking #6375's golden-path red; reproduced on #6375's head and on main 553bb7e78a with the place CI drew.
