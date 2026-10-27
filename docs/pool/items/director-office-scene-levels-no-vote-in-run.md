---
id: director-office-scene-levels-no-vote-in-run
title: "office-scene-levels fails on some draws: no body votes on the scene's bill within the run (Farmingdale, Maine, OFFICE_SCENE_SEED 4f0adcbbcc5208ab; red on main)"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: director
source: director lead, found while testing #6300, Oct 27
---

**What.** `src/director/office-scene-levels.test.ts` fails "reads the moved position in at least one recorded vote" on clean main (5b8dcfd7ec) with OFFICE_SCENE_SEED=4f0adcbbcc5208ab: Farmingdale, Maine (2324635), run to 2027-08-02, captured both a state and a federal office scene, but neither body recorded a vote by the scene's target on the scene's bill, so voteChecked stayed 0.

**Rules.** Root cause first: either the bill never reaches a floor vote in the run (the test's wait is too short for that body's calendar) or the target leaves the body; fix the test's wait from the body's own calendar if so, or the engine if the vote is lost. Never skip the assertion.

**Done when.** The test passes on 4f0adcbbcc5208ab and three fresh seeds, and the PR names why no vote was recorded, by bill and member record id.

**Files.** src/director/office-scene-levels.test.ts

**Notes.** Found while testing director-president-asks-within-powers; the failure does not touch the opening.
