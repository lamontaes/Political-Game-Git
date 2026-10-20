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

**What.** In a territory town (Vaitogi, American Samoa, `OFFICE_SCENE_SEED` 3f4d6341ed8d0121) the state-level office scene picked a colleague who held a seat but was not an official the officials engine had seated, so the scene's target had no stance a case could move. The scene's check of the moved stance then failed because a case made by a sponsor who is not the played person keeps only its latest cause. Pick only seated officials as targets in a body the officials engine covers, and check the case through the hearing count the views engine keeps for everyone.

**Rules.** An effect is a read, not a record: a scene targets someone whose stance a vote reads. One rule, all 56 places: the check draws places and names the seed. No dice: the target is the colleague nearest the player's side by recorded position.

**Done when.** In a played world in a place drawn from all 56 and a seed the builder did not choose (name both in the PR body), the office scene opens on a seated official at the state and the federal level and the vote reads the moved position, and `src/director/office-scene-levels.test.ts` passes on the pinned seed 3f4d6341ed8d0121 and on two other seeds.

**Files.** src/director/office-scene.ts, src/director/office-scene-levels.test.ts

**Notes.** Red on main with the pinned seed. Fixed in the pull request that carries this note.
