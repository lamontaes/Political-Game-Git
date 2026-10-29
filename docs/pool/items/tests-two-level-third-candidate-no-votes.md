---
id: tests-two-level-third-candidate-no-votes
title: "two-level-elections fails on main: an independent in a two-party statewide race gets no votes, and a Washington town has no two-party race"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: wire-elections
source: wire-office session, Oct 28 (found red on main)
---

**What.** src/core2/two-level-elections.test.ts fails on clean main for two of four fixed seeds. With GOLDEN_PATH_SEED=b2 (Clayville, Rhode Island, 4415940) the Attorney General race has a third filing with no party and it gets 0 votes, while the test expects every filing in a contested race to get real votes; the same failure was seen with a Governor race on a random seed. With GOLDEN_PATH_SEED=c3 (Machias, Washington, 5341470) no November 3, 2026 race has both a Republican and a Democrat on the ballot. Seeds a1 and d4 pass.

**Rules.** No dice: a candidate's votes come from voters' appeals, so a candidate with zero votes must be explained by the appeal, never forced by a roll or a floor. One rule, all 56 places: the fix and its test draw places from data and the failure names the place and the seed. Never weaken a test: the expectation is kept or replaced by one as strong, derived from the race's records.

**Done when.** src/core2/two-level-elections.test.ts passes with GOLDEN_PATH_SEED=b2 and c3 and on ten more drawn seeds, the failure message names the place and seed, and the PR body says why the independent got no votes and why Machias had no two-party race, by contest record id.

**Time box.** 3 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Files.** src/core2/two-level-elections.test.ts, src/core2/modules/voting.ts

**Notes.** Found by the wire-office session on Oct 28 while testing the 2024 vote drawn per world; both seeds fail identically on clean main at d3ee6986bc.
