---
id: people-office-scene-state-target-not-official
title: "In a territory town the state-level office scene's target is not an official and no recorded vote reads the moved stance (Vaitogi, American Samoa, OFFICE_SCENE_SEED 3f4d6341ed8d0121; also red on main)"
area: people
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/office-scene-territory
pr: #5161
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:00:58.536Z
---

**What.** `src/director/office-scene-levels.test.ts` fails on clean main and on `words/word-pack` with OFFICE_SCENE_SEED=3f4d6341ed8d0121, which draws Vaitogi, American Samoa. The state-level office scene opens on someone `officialOf` does not find, so the first assertion that the target is an official reads undefined. The second test finds no recorded vote that reads the moved position (state yes, federal yes, 0 votes) to August 7, 2027. A territory's legislature may be seated differently from a state's, so the scene's target pick and the vote read do not meet there.

**Rules.** One rule, all 56 places: a territory's legislature is cast and voted through the same office scene as a state's, from its own records.

**Done when.** The test passes with OFFICE_SCENE_SEED=3f4d6341ed8d0121 and with three seeds the builder did not choose, each naming the drawn place and the target's record id in the test output.

**Files.** `src/director/office-scene.ts`, `src/director/office-scene-levels.test.ts`, `src/core2/modules/officials.ts`.

**Notes.** Found by the Words session on Oct 19 while checking #4626; the same failure on main rules out the word pack. `core-counted-drift-delete` also lists this test as one whose numbers move.
