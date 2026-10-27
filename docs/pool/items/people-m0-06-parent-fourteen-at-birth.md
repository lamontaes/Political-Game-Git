---
id: people-m0-06-parent-fourteen-at-birth
title: "M0-06 fails in Rand, West Virginia: the 18-year-old's parent was 14 at their birth"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #6063
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T17:08:18.851Z
---

**What.** The golden-path spec M0-06 (src/core2/m0-life-at-18.test.ts, 'gives them parents of child-bearing age at their birth, and siblings who share a parent') fails on clean main 0532b566a4 with GOLDEN_PATH_SEED=553b7186a7662f5664d5b8a0ae6556949d26f01a18472ba07767837df2ff624f and GOLDEN_PATH_PLACE_KEY=5466892 (Rand, West Virginia): 'expected 14 to be greater than or equal to 15'. A parent of the player was 14 when the player was born. The draw came from CI on PR 6021, whose diff does not touch people or kin, and turns accepted M0-06 red for any PR that draws it.

**Rules.** Never loosen the test: the kin rules hold. No dice: who is born to whom follows the kin rules and the place's records. One rule, all 56 places: find the cause in the kin generation, not by skipping a place.

**Done when.** src/core2/m0-life-at-18.test.ts passes with that seed and place key and on two fresh seeds named in the PR body, and the PR names by file and line why a 14-year-old parent was generated in Rand. **On screen.** Nothing yet: it would show on Who you are and News, and nothing there reads it.

**Files.** src/core2/m0-life-at-18.test.ts, src/core2/population.ts

**Notes.** Reopened Oct 27 by the laws-and-effects lead: after #6063 merged, M0-06 fails again the same way on clean main (69028b6155) in Hebron, Wisconsin (5533675), seed ed0fcb9d5fe8c4fc405921ee692d31ba212d34a236b449fb2c63040a79e143bb: "gives them parents of child-bearing age at their birth" expected 14 to be greater than or equal to 15 (measured). First seen in the golden-path job of PR #5657 (job 122026050728, head 427e58b558), which changes no kin or birth code. #6063's fix (branch claude/m0-06-parent-age) covers some draws but not this one.
