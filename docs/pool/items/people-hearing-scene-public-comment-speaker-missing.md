---
id: people-hearing-scene-public-comment-speaker-missing
title: "hearing-scenes.test fails on main: a public comment's hearing scene does not include the speaker (Gurabo, Puerto Rico, seed 73f460ee5b952b1500d1be443f47ac09ffd6e244)"
area: people
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/hearing-scene-red
pr: #5153
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:03:11.155Z
---

**What.** The test "a public comment is a hearing scene for the speaker, citing the comment record" in src/director/hearing-scenes.test.ts fails on clean main with seed 73f460ee5b952b1500d1be443f47ac09ffd6e244 in Gurabo, Puerto Rico. The failing line is the first check: the watched person, person_4606fe849b174794, is not among the public comment's recorded people, because the comment was made by person_d87e71f467ee87c6 and the director staged a hearing scene around a watched resident who did not speak. This is the defect that people-hearing-scene-staged-for-non-speaker (PR #5055) fixes, so this item is a duplicate of it and finishes when that PR merges.

**Rules.** An effect is a read, not a record: the scene reads the comment record and its speaker. One rule, all 56 places: the case is a territory's municipio, so nothing names Puerto Rico. No dice.

**Done when.** In the played world (buildBenchWorld, a drawn place from all 56 and a seed the builder did not choose), a watched resident's public-comment hearing scene is staged only for the person on the comment record, by person id. With GOLDEN_PATH_SEED=73f460ee5b952b1500d1be443f47ac09ffd6e244 the test in src/director/hearing-scenes.test.ts passes once people-hearing-scene-staged-for-non-speaker is merged, and it passes on two more random seeds.

**Files.** src/director/hearing-scenes.test.ts, src/director/scheduling.ts

**Notes.** Found Oct 19 while checking PR #5150. Reproduced on clean origin/main with that seed (626,791 ms), then traced: the speaker role is always the moment's own person, and the failing check is that person being in the comment record's people, so a moment for a non-speaker is the cause. Not built here, since PR #5055 holds the fix.
