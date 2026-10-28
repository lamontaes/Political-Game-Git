---
id: tests-scene-staged-fails-on-seed-wire-l1-c
title: "The director's scene test stages no scene on seed wire-l1-c"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/scene.test.ts 'builds each staged scene from its records, in second person, and opens a conversation' fails with 'expected 0 to be greater than 0' when GOLDEN_PATH_SEED=wire-l1-c, identically on clean main at 4732dda71c (Oct 28); its default seed scenes-a passes. The test builds its world with buildDeepPast from the seed, so the staged-scene count depends on which past the seed draws, and on this seed no moment stages a scene. The cause is not yet traced to a record.

**Rules.** One rule, all 56 places: a test that claims a rule holds must hold on any seed, or say which records it needs and build them from the world. No dice: the fix is the cause in the records, not a seed change.

**Done when.** scene.test.ts passes on GOLDEN_PATH_SEED=wire-l1-c and on three seeds the builder did not choose (named in the PR body), with the cause named by record (what the seed's world lacked that a scene needs).

**Files.** src/director/scene.test.ts,src/director/scheduling.ts

**Notes.** Found by wire-opening-and-home while merging main into PR #6568 (Oct 28). Read: OWNER-DECISIONS through Oct 28 05:30 UTC; searched the pool for scene.test.ts and the test's name.
