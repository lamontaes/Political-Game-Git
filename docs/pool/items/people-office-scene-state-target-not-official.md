---
id: people-office-scene-state-target-not-official
title: "In a territory town the state-level office scene's target is not an official and no recorded vote reads the moved stance (Vaitogi, American Samoa, OFFICE_SCENE_SEED 3f4d6341ed8d0121; also red on main)"
area: people
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/office-scene-territory
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:00:58.536Z
---

**What.** In Vaitogi, American Samoa (OFFICE_SCENE_SEED 3f4d6341ed8d0121) the state-level office scene's target is not an official, and no recorded vote reads the stance the scene moved; the test is also red on main. Find who the scene picks as its target in a territory town and make it an official who holds the seat, then make the moved stance feed a recorded vote. The same check should hold in every territory town.

**Rules.** No dice: the target follows the seat's holder in the records, never a roll. An effect is a read, not a record: the vote reads the stance the scene moved.

**Done when.** In a one-year run of the played world (buildBenchWorld) in Vaitogi, American Samoa with OFFICE_SCENE_SEED 3f4d6341ed8d0121 and in one other drawn territory town, the state-level office scene's target is a seated official by person record id, a recorded vote reads the moved stance, and src/director/office-scene.test.ts passes.

**Files.** src/director/office-scene.ts, src/director/office-scene.test.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
