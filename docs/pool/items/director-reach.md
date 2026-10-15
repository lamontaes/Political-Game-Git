---
id: director-reach
title: "Order 4: every situation whose producer exists fires in play from its cause record"
area: director
kind: wiring
priority: 2
status: claimed
claimed-by: claude/director-reach
pr:
blocked-on:
milestone:
source: "words-and-director order 4"
claimed-at: 2026-10-15T22:54:08.812Z
---

**What.** The director has situation types and producers, but nobody has shown that they fire in play. Prove it for a year of a 17-year-old's household in a drawn place: list every scene that fired with its cause record, and every situation whose producer exists that never fired with the reason (no cause happened, or a gap). Then extend the office scene to the state and federal levels on the same engine so a state legislator or member of Congress gets the same kind of scene as a council member. A quiet day must fire nothing. The player would notice scenes interrupting him when the records say something happened, and a federal or state seat playing like the town seat.

**Rules.** No dice: a scene fires from a recorded cause, never a roll or a monthly chance; a quiet day fires nothing; Sliding scales and causes: scene weight grows with the size of the cause, with no threshold that flips it; The chain is the acceptance: each fired scene is traced from its cause record to the scene to the journal line; Ask why: a situation that did not fire reports the missing cause; One rule, all 56 places: a random place and seed from all 56, named; No hand-written player text: scene words come from the English engine and the banks; Wire to the world: the producers fire in the played world for all situation types; Speed: scene detection acts on the day a record is written, never by scanning the world each day.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), for the household of a 17-year-old: the PR body (and `scripts/dialogue-batch/scene-year.ts` output) lists each scene with its cause record id and each unfired situation type with its reason, and a state and a federal office scene fire from `src/director/office-scene.ts` on the same engine. Tests in `src/director/director.test.ts`, `scene.test.ts` and `office-scene.test.ts`. The owner plays it: skips a year and is stopped by scenes whose cause he can look up.

**Files.** src/director/scene.ts, src/director/scheduling.ts, src/director/office-scene.ts, src/director/data/situation-types.json, scripts/dialogue-batch/scene-year.ts

**Notes.** words-catalog-coverage (the blocked-on item) is done as of 2026-10-15 (PR #4398), so the block can clear.
