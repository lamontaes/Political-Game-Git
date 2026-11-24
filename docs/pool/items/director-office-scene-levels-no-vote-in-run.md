---
id: director-office-scene-levels-no-vote-in-run
title: "office-scene-levels fails on some draws: no body votes on the scene's bill within the run (Farmingdale, Maine, OFFICE_SCENE_SEED 4f0adcbbcc5208ab; red on main)"
area: director
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
lead: director
source: director lead, found while testing #6300, Oct 27
---

**What.** `src/director/office-scene-levels.test.ts` fails "reads the moved position in at least one recorded vote" on clean main (5b8dcfd7ec) with OFFICE_SCENE_SEED=4f0adcbbcc5208ab. In Farmingdale, Maine (2324635), run to 2027-08-02, the test captured both a state and a federal office scene. Neither body then recorded a vote by the scene's target on the scene's bill, so the count of checked votes stayed at zero and the test failed.

**Rules.** Ask why: the PR names, by bill and member record id, why no vote was recorded (the bill never reached the floor inside the run, or the target left the body). Wire to the world: if the test's wait is shorter than that body's own calendar, the wait is read from the calendar records, never a bigger fixed number. Never skip or loosen the assertion.

**Done when.** The test passes with OFFICE_SCENE_SEED=4f0adcbbcc5208ab and with three fresh seeds the builder did not choose, in played worlds built by buildBenchWorld, and the PR body names the bill and member record ids that explain the missing vote.

**Files.** src/director/office-scene-levels.test.ts

**Notes.** Found while testing director-president-asks-within-powers; the failure does not touch the opening.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, replaced. The test file was deleted with the whole office scene in commit c67d0365f4 (Oct 28, "delete the dead office scene"), which removed `src/director/office-scene-levels.test.ts`, `office-scene.ts` and its data. Nothing on main reads OFFICE_SCENE_SEED, and neither file exists now. The office scene is replaced by the director's circumstance and purpose scenes (docs/design/director-on-core2.md).

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): already done on main (evidence in the Notes above).
