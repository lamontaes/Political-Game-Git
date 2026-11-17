---
id: tests-office-hours-scene-lynwood-no-scene
title: "The office-hours scene test finds a visit with no office-hours scene at Lynwood, Illinois"
area: director
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Desk thread, Nov 16, gating #9581 on Train a62a2fda
---

**What.** `src/director/office-hours-scene.test.ts` draws its place at run time. On one draw it fails: "Lynwood, Illinois (1745421), seed 58330c8cdcbd2845bf4da40299f20a7eed887a2d:0: office-approached:case:person_d873ad3b828ee9a7:2025-02-19: no office-hours scene". The official's schedule has no entry for the visit with an office-hours binding.
Seen: red with `GOLDEN_PATH_SEED=58330c8cdcbd2845bf4da40299f20a7eed887a2d` on clean Train a62a2fdad884ccd1313d1e1436088fe05986d49b, and the same at #9581's head (which does not change the file).

**Cause.** Needs cause. Not traced. Two places to read first: the scheduling queue that drops an office.approached moment when it does not rank (scene-office-hours-visit-never-staged-for-player names it), or the visit's official not being matched by the office-hours type at this place.

**Fix.** None until the cause is found.

**Time box.** 2 hours, one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: the office-hours scene stages for any official's visit at any place. Wire to the world: the visit record is what the scene reads.

**Done when.** At Lynwood IL (seed above) and at a drawn place with a seed nobody chose, every office.approached visit to a watched official has its office-hours scene, and the test is pinned to named places and fixed seeds (skill pinned-tests); a second session sees it in the running game.

**Waits on.** Nothing.

**Files.** src/director/scheduling.ts

**Notes.**

- Nov 17, story-cut-deleted-scene-kinds: src/director/office-hours-scene.test.ts deleted with its scene kind (owner, Nov 17: "DELETE EVERYTHING THAT IT HASNT WRITTEN"). Dropped: the scene kind this item serves is deleted.
