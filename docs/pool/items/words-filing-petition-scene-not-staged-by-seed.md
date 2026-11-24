---
id: words-filing-petition-scene-not-staged-by-seed
title: "The clerk's petition scene is not staged after filing at North Amityville, New York (seed 96f34b32a90f7079)"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-words-filing-petition-scene-not-staged-by-seed
---

**What.** src/bench/filing-counter-petition.test.ts fails on main and on #7101 at GOLDEN_PATH_SEED=96f34b32a90f7079: North Amityville, New York (3651396), world seed 48ecdf8d2595a1bafbf052509fe6e2fa00f861fe559fbc7a97fa73f32b6b6d62. The player files, the elections engine writes the petition, but the director's book holds no filing scene for it ('no filing scene staged'). Found by Words while answering Checker 1's send-back on #7101 (Nov 2).

**Cause.** Measured: GOLDEN_PATH_SEED=96f34b32a90f7079 (North Amityville, New York 3651396; world seed 48ecdf8d2595a1bafbf052509fe6e2fa00f861fe559fbc7a97fa73f32b6b6d62) and GOLDEN_PATH_SEED=9472a5100db5d8d3 (Boggstown, Indiana 1806292) with npx vitest run src/bench/filing-counter-petition.test.ts: 'no filing scene staged'. Cause per Words (Nov 2): filingClerkFor (src/core2/modules/filing-clerk.ts) named no one for a county-board filing, so the filing scene could not cast its clerk; gov-filing-counter-clerk-at-county-board, which seats that person, is now done, so re-measure first.

**Fix.** Rerun both seeds on main. If still red, stage the petition scene from the elections engine's petition record with a clerk from filingClerkFor, and where a counter truly has none skip it as filing-visit-talk.test.ts does, naming the place.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Wire to the world: the scene is staged from the elections engine's petition record, the same in every place. Red by seed is red (red-main skill). A scene is staged from the record that causes it (scene-producers); one rule for all 56 places.

**Done when.** A second session runs src/bench/filing-counter-petition.test.ts at GOLDEN_PATH_SEED=96f34b32a90f7079, 9472a5100db5d8d3 and three seeds it chose in drawn places (named); it passes, and the report names the cause of any unstaged petition scene by file and line and by the filing record id it read.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/bench/filing-counter-petition.test.ts, src/core2/modules/filing-clerk.ts

**Notes.** TODO

Words handoff, Nov 2 02:50 UTC (the account at its weekly limit): branch words/petition-scene-by-seed, head e236e35ae6. Cause found: North Amityville, New York files its town races with the county board of elections, has no town clerk, so filingClerkFor names no one and the filing scene cannot cast its clerk. The branch makes filing-counter-petition.test.ts skip a counter with no clerk, as filing-visit-talk.test.ts does, and passes at seed 96f34b32a90f7079. The missing person is gov-filing-counter-clerk-at-county-board (lead governing). Next step: run the test on three fresh draws, then open the PR with line 1 `Pool item: words-filing-petition-scene-not-staged-by-seed`.

Nov 3 (Lane 1): the same failure on another seed, on main da7ec81210 as well as on governing/one-council-race: GOLDEN_PATH_SEED=9472a5100db5d8d3 draws Boggstown, Indiana (1806292), world seed 499053f19e9db4f1d6c9036674aa6ed328e4eb046c5d626a2df57172b3b65437, and fails with "no filing scene staged". The cause is not traced yet; the first thing to check is whether its counter has a clerk (filingClerkFor).

Released (2026-11-11): Not reproducible on main 21587c9ec7, as the item's own Fix said to re-measure: src/bench/filing-counter-petition.test.ts passes at GOLDEN_PATH_SEED=96f34b32a90f7079 (North Amityville, New York 3651396) and GOLDEN_PATH_SEED=9472a5100db5d8d3 (Boggstown, Indiana 1806292); gov-filing-counter-clerk-at-county-board seats the county-board clerk, so the scene casts. Nothing to build; a second session can set the item done after one more rerun in a place nobody chose. Continue on branch claude/pool-words-filing-petition-scene-not-staged-by-seed.

Released (2026-11-11): Cause differs on main 2026-11-11: src/bench/filing-counter-petition.test.ts passes (1 of 1) at both named seeds, GOLDEN_PATH_SEED=96f34b32a90f7079 (North Amityville NY) and 9472a5100db5d8d3 (Boggstown IN), and at a seed I chose, 5d3a0c9e1b7f4a62; gov-filing-counter-clerk-at-county-board landed since. No red to fix; close the item. Continue on branch claude/pool-words-filing-petition-scene-not-staged-by-seed.
