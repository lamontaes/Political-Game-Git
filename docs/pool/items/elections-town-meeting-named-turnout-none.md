---
id: elections-town-meeting-named-turnout-none
title: "Golden path M2-07 fails in Troy, Vermont: none of 56 named adults votes in the March town meeting board race"
lead: m0-m2
area: elections
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/town-meeting-turnout
pr: #6481
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T01:51:33.993Z
---

**What.** src/core2/voting.test.ts (the accepted golden-path spec M2-07) fails on main at 553bb7e78a with GOLDEN_PATH_SEED=30d6e503a862ff5c84e2be4e6ed63115dfe5582beb4b94fc16ebf8cb4018a7b2 and GOLDEN_PATH_PLACE_KEY=5073450 (Troy, Vermont): 'no noncandidate choice checked against its reasons'. Its race is contest:seat:gus2025:140636:board:0:2026-03-03, a board seat on Town Meeting Day 2026 with three candidates, and none of the 56 named eligible adults casts a ballot. A typical ballot, ballot:contest:seat:gus2025:140636:board:0:2026-03-03:person_15854ff4c6cfc7d6, has a cost of 2.84 against duty 0.07 and interest 0.64, for a turnout propensity of 0.008; another reads 0.006. The off-cycle cost, offCycleTurnoutCost 1.8 in src/core2/data/campaigns/parameters.json, is checked so named off-cycle turnout averages about 25% of eligible adults, so this race falls far outside its own calibration. It turned the golden-path check red twice on #6375 (head 44088842b9), whose diff touches no voting code.

**Rules.** No dice: turnout stays each person's own reasons, never a roll or a floor. Never loosen the test to pass on zero ballots. Ask why: name, by ballot id, the term that puts these voters' propensity under 1%, and fix the cause, not the draw. One rule, all 56 places.

**Done when.** The PR body names the term by ballot id; voting.test.ts passes on that seed and place on main and on two fresh seeds named in the PR body; named turnout in eight random off-cycle races, places and seeds named, stays within the offCycleTurnoutCost parameter's checked range.

**Files.** src/core2/modules/voting.ts, src/core2/data/campaigns/parameters.json, src/core2/voting.test.ts

**Notes.** Found Oct 27 by the laws-and-effects lead while checking #6375's golden-path red; reproduced on #6375's head and on main 553bb7e78a with the place CI drew.


Evidence (integrator, Oct 27, 22:45 UTC): the same failure on main at d4ccbf562d in Magnolia, Delaware: GOLDEN_PATH_SEED=a1c100a9b6b3cd7dfe587313bcbc32206f0f34a2e30f142254d250e28a3e91a9 GOLDEN_PATH_PLACE_KEY=1044430 (drawn for PR #6412 head 976d2ec5), "1044430: no noncandidate choice checked against its reasons"; it reproduces identically on clean main.

Also fails at 136195138f in North Hodge, Louisiana (GOLDEN_PATH_PLACE_KEY=2255910, GOLDEN_PATH_SEED=4bc12f24182caba80ed52d1997eea284248784b480250618f9d25a2c32b2035c), the place CI drew for #6492: same message. Guards session, Oct 28.

Also fails at 2c891bd8ee in Bradford, Vermont (GOLDEN_PATH_PLACE_KEY=5007225, GOLDEN_PATH_SEED=d05c6ceb349990fcb06d01f1126a2a0c149ad63b9d9ad981c364ba76bf1374ec), the place the golden path drew for the old engine deletion branch: same message, identical on clean main. Old engine session, Oct 28.
