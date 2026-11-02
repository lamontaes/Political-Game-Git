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

**Rules.** Red by seed is red (red-main skill). A scene is staged from the record that causes it (scene-producers); one rule for all 56 places.

**Done when.** The test passes at GOLDEN_PATH_SEED=96f34b32a90f7079 and on three fresh drawn place seeds named in the PR body, with the cause of the unstaged petition scene named by file and line and by the filing record id it read.

**Files.** src/director/purpose-scene.ts, src/bench/filing-counter-petition.test.ts

**Notes.** TODO
