---
id: tests-election-day-no-race-to-enter
title: "election-day.test finds no race the player may enter in eight drawn towns"
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

**What.** src/bench/election-day.test.ts fails on clean main (origin/main 0df97f1b, Nov 4) with GOLDEN_PATH_SEED=e253fc7f73075455: every draw says 'no race the player could enter' (Milbridge, Maine 2345565; South Barre, Vermont 5066025; Tellico Village, Tennessee 4773270; Dixon, Iowa 1921540; Tuckerton, New Jersey 3474210; Rose Hill, Virginia 5168885; Fairfield Harbour, North Carolina 3722305; Agana Heights, Guam). Found by Lane 4 while checking results-screen-raw-words.

**Rules.** One rule, all 56 places. The filing answer is the elections engine's (playerMayFileFor, filingWindowOpen; agreement 1-4). Never loosen the test.

**Done when.** GOLDEN_PATH_SEED=e253fc7f73075455 passes src/bench/election-day.test.ts, or the test's race search is shown wrong and fixed through the clerk's list (playerContests), with a second drawn seed named in the PR.

**Files.** src/bench/election-day.test.ts, src/core2/modules/elections.ts

**Notes.** lead: Lane 1 (filing seams, agreement 1-4).
