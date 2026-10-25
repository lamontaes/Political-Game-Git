---
id: people-m0-06-parent-fourteen-at-birth
title: "M0-06 fails in Rand, West Virginia: the 18-year-old's parent was 14 at their birth"
area: people
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/m0-06-parent-age
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T17:08:18.851Z
---

**What.** The golden-path spec M0-06 (src/core2/m0-life-at-18.test.ts, 'gives them parents of child-bearing age at their birth, and siblings who share a parent') fails on clean main 0532b566a4 with GOLDEN_PATH_SEED=553b7186a7662f5664d5b8a0ae6556949d26f01a18472ba07767837df2ff624f and GOLDEN_PATH_PLACE_KEY=5466892 (Rand, West Virginia): 'expected 14 to be greater than or equal to 15'. A parent of the player was 14 when the player was born. The draw came from CI on PR 6021, whose diff does not touch people or kin, and turns accepted M0-06 red for any PR that draws it.

**Rules.** Never loosen the test: the kin rules hold. No dice: who is born to whom follows the kin rules and the place's records. One rule, all 56 places: find the cause in the kin generation, not by skipping a place.

**Done when.** src/core2/m0-life-at-18.test.ts passes with that seed and place key and on two fresh seeds named in the PR body, and the PR names by file and line why a 14-year-old parent was generated in Rand.

**Files.** src/core2/m0-life-at-18.test.ts, src/core2/population.ts

**Notes.** TODO
