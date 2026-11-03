---
id: words-filing-petition-scene-not-staged-by-seed
title: "The clerk's petition scene is not staged after filing at North Amityville, New York (seed 96f34b32a90f7079)"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/bench/filing-counter-petition.test.ts fails on main and on #7101 at GOLDEN_PATH_SEED=96f34b32a90f7079: North Amityville, New York (3651396), world seed 48ecdf8d2595a1bafbf052509fe6e2fa00f861fe559fbc7a97fa73f32b6b6d62. The player files, the elections engine writes the petition, but the director's book holds no filing scene for it ('no filing scene staged'). Found by Words while answering Checker 1's send-back on #7101 (Nov 2).

**Rules.** Wire to the world: the scene is staged from the elections engine's petition record, the same in every place. Red by seed is red (red-main skill). A scene is staged from the record that causes it (scene-producers); one rule for all 56 places.

**Done when.** The test passes at GOLDEN_PATH_SEED=96f34b32a90f7079 and on three fresh drawn place seeds named in the PR body, with the cause of the unstaged petition scene named by file and line and by the filing record id it read.

**Files.** src/director/purpose-scene.ts, src/bench/filing-counter-petition.test.ts

**Notes.** TODO

Words handoff, Nov 2 02:50 UTC (the account at its weekly limit): branch words/petition-scene-by-seed, head e236e35ae6. Cause found: North Amityville, New York files its town races with the county board of elections, has no town clerk, so filingClerkFor names no one and the filing scene cannot cast its clerk. The branch makes filing-counter-petition.test.ts skip a counter with no clerk, as filing-visit-talk.test.ts does, and passes at seed 96f34b32a90f7079. The missing person is gov-filing-counter-clerk-at-county-board (lead governing). Next step: run the test on three fresh draws, then open the PR with line 1 `Pool item: words-filing-petition-scene-not-staged-by-seed`.

Nov 3 (Lane 1): the same failure on another seed, on main eb1b5f056b as well as on governing/one-council-race: GOLDEN_PATH_SEED=9472a5100db5d8d3 draws Boggstown, Indiana (1806292), world seed 499053f19e9db4f1d6c9036674aa6ed328e4eb046c5d626a2df57172b3b65437, and fails with "no filing scene staged". The cause is not traced yet; the first thing to check is whether its counter has a clerk (filingClerkFor).
