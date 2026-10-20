---
id: director-electoral-filing-test-slow
title: "electoral-scenes.test (filing and campaign stop) runs past 20 minutes in some drawn places: GOLDEN_PATH_SEED fs1 exceeds 1,200 seconds on clean main"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The second test in src/director/electoral-scenes.test.ts (a filing is a scene with the office's clerk, and a campaign speech is a stop with its listeners) runs past 20 minutes in some drawn places, so it times out at its own 900-second limit or hangs far past it. With GOLDEN_PATH_SEED fs1 it ran over 1,200 seconds on clean main and on a branch alike, while another random draw on main finished within the limit. Find what the test does in the slow places (a long advance, a search that never finds its contest, or a year of play) and bound it, so the test finishes in every drawn place.

**Rules.** Speed: a test of the played world draws its place from all 56 and names the place and seed, and a draw that cannot show the case is skipped or redrawn, never waited on. Never skip a test to get green: bound its work, and keep its assertions. One rule, all 56 places.

**Done when.** Run as GOLDEN_PATH_SEED=fs1 npx vitest run src/director/electoral-scenes.test.ts -t filing, the test finishes under 10 minutes and its assertions on the clerk, the filing record and the campaign stop's listeners still pass or the drawn place is redrawn and named; two other seeds also finish, shown by the test output.

**Files.** src/director/electoral-scenes.test.ts

**Notes.** Found Oct 20 while testing the victory and concession scene words. Replay: GOLDEN_PATH_SEED=fs1, 1,200 seconds exceeded on both a branch and clean main (the place was not printed, since the test hung before naming it). An earlier random draw timed out at 900 seconds on a branch; a later random draw passed on main. The other test in the file, the night of the count, passes.
