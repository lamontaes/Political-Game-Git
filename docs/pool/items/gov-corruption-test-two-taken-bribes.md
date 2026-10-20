---
id: gov-corruption-test-two-taken-bribes
title: "The basic corruption test needs two taken bribes, and some drawn towns give one"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/corruption.test.ts 'settles a taken bribe by the vote' expects at least two taken bribes (line 159) and fails on clean main in Hawleyville, Connecticut (GOLDEN_PATH_SEED 7d4c701fc31a10350bc60db43d6af340a651c33e02de11d1a30d3b6d12e6dec6, GOLDEN_PATH_PLACE_KEY 0937490): one bribe was taken. This red M3-09 (accepted) on the golden-path run of PR #5715.

**Rules.** Never narrow or skip the test: give the test town enough asks for two takes from causes (officials' need, ties and traits), or draw again with bounded retries and fail when they run out, naming every place tried.

**Done when.** src/core2/corruption.test.ts passes with the seed and place above and on three fresh draws from all 56.

**Files.** src/core2/corruption.test.ts

**Notes.** TODO
