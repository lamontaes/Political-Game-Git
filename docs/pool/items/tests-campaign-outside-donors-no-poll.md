---
id: tests-campaign-outside-donors-no-poll
title: "campaign-outside-donors.test.ts is red on clean main: a state official's Senate campaign in Strasburg, North Dakota raises but buys no poll in 360 days"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: wire-elections
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** src/core2/campaign-outside-donors.test.ts fails on clean main with GOLDEN_PATH_SEED=pet-run-1 (Oct 28, 21:05 UTC). In Strasburg, North Dakota (3876500), place seed 273562d7baee41cdcec1eb38d32cc89d442587e61b63a699457dcb3bdc5b2cf1, the candidate person:cabinet:US-ND:budget files for the 2030 U.S. Senate race and runs 120 campaign turns three days apart. The test's last check fails: no poll is bought (polls 0). The race is five years out, so the campaign may hold its money for later, or the poll purchase may wait for a window the test never reaches. Guards: campaign-outside-donors.test, red on clean main in Strasburg, North Dakota.

**Cause.** Needs cause. Looked at src/core2/campaign-outside-donors.test.ts and src/core2/modules/campaigns.ts: GOLDEN_PATH_SEED=pet-run-1 in Strasburg, North Dakota gives polls 0, and neither a held budget nor a poll window is shown as the reason.

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** Ask why: find why a funded statewide campaign buys no poll before changing the race the test picks or its turns; never weaken a test to get green. One rule, all 56 places: the test draws from all 56 places and names those it passes over.

**Done when.** A second session runs the outside donors test on ten fresh GOLDEN_PATH_SEED draws in the played world (buildBenchWorld) and sees every run pass, each naming the place, the seed and the poll record id. The PR names the cause of the zero polls by file and line.

**Waits on.** Nothing.

**Files.** src/core2/campaign-outside-donors.test.ts, src/core2/modules/campaigns.ts

**Notes.** lead: elections. Found by the elections wire session while running the petition line's tests; identical on clean main with the vacant-seat fix.
