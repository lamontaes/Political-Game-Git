---
id: tests-campaigns-rival-reaches-nobody-small-place
title: "M2-05 fails where the rival's campaign turn reaches nobody (Bazile Mills, Nebraska)"
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

**What.** The golden-path spec M2-05 (src/core2/campaigns.test.ts) fails on clean main (185d76d7ce) in Bazile Mills, Nebraska (place key 3103355, seed ccb7c0f8d8374e5ebaae4f43472c44c6cb52740684392d7b7bebcbdb2e03cdf4): 'expected 0 to be greater than 0' at campaigns.test.ts:191, because the rival's campaignTurn knocks on no doors. The golden path draws its place from each PR's commit, so any PR that draws a place like this goes red on golden-path without touching campaigns (seen on lamontaes/Political-Game-Git#5863). Find why a rival in a very small place reaches nobody (no door the rival can reach, or the test's contest picks a seat with no residents) and fix the cause, not the assertion.

**Rules.** One rule, all 56 places: the campaigns test must hold in every drawn place, so fix why a small town's rival reaches nobody; no dice decides who is reached; never skip or weaken the assertion.

**Done when.** GOLDEN_PATH_SEED=ccb7c0f8d8374e5ebaae4f43472c44c6cb52740684392d7b7bebcbdb2e03cdf4 GOLDEN_PATH_PLACE_KEY=3103355 npx vitest run src/core2/campaigns.test.ts passes, with the cause named in the PR, and the test passes on three more drawn places named with their seeds.

**Files.** src/core2/campaigns.test.ts, src/core2/modules/campaigns.ts

**Notes.** TODO
