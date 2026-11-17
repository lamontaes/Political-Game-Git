---
id: director-constituent-help-variants-test-draws-random-seed
title: "The office-hours variants test draws a random seed and fails when the director sets a visit aside as a journal line"
area: director
kind: bug
priority: 3
size: S
status: dropped
claimed-by:
pr:
after:
blocked-on:
source: found while carrying #8956 on #9199
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** `src/director/constituent-help-variants.test.ts` (removed) takes its seed from `GOLDEN_PATH_SEED` or draws a random one, so it is red by draw. At seed 2b17bb1e0a69c888 (draw 1, Lincroft, New Jersey, world seed c537198a8ea65fa182b2259256edac038f847fecfe7291d56750150e6e821790) the test fails on the pushed train head with no change of mine: a looking-for-work visit (`office-approached:case:person_e06795a625c12445:2025-02-19`) has a schedule entry with no bindings and outcome `journal-line`, so `purposeScene` returns nothing and the test's `expect(result?.kind).toBe("composed")` fails. In that town 6 of 14 visits came out as journal lines in 90 days, because the director sets aside a visit that ranks outside the life's pace. Seen: the office-hours scenes a seated official gets in a played quarter.

**More evidence.** The same failure at seed 9d18cfd99e68d810 (draw 0, Alderwood Manor, Washington, world seed 4adf4dcc855b4774bdbce2bcc879008e28aed9c669246da718d5687a4986190e): visit `office-approached:case:person_507781363ad93a0a:2025-02-19` returns no scene (`expected undefined to be 'composed'`), with and without the office-hours bank change of #9199. Add it to the pinned places.

**Cause.** Found in code: the test asserts "composed" for every visit in the route (line 168), but `scheduleMoment` in src/director/scheduling.ts gives a moment the outcome `journal-line` when it ranks outside the pace, and such an entry holds no bindings for `purposeScene` to read. The test, not the director, is wrong about what every visit becomes.

**Fix.** Pin the test to named places with fixed seeds (the pinned-tests skill): the places and seeds it passes at today, plus one pinned test for Lincroft, New Jersey (seed 2b17bb1e0a69c888:1) that asserts a visit set aside as a journal line has outcome `journal-line` and no scene, and that every visit with bindings composes. Explicit timeouts, about a minute each.

**Time box.** 2 hours for a Sonnet session at medium effort.

**Rules.** No dice. One rule, all 56 places: pinned places are named in the test, not in logic. Never loosen the composed assertion for visits that have a scene.

**Done when.** A second session runs the pinned tests at three drawn places (Lincroft, New Jersey among them, each named with its seed) and sees them pass on the same result every run, and in a played quarter at one of them sees a visit that was set aside show up as a journal line and not as a scene.

**Waits on.** Nothing.

**Files.** src/director/data/kept-scene-kinds.json

**Notes.**

- Nov 17, story-cut-deleted-scene-kinds: src/director/constituent-help-variants.test.ts deleted with its scene kind (owner, Nov 17: "DELETE EVERYTHING THAT IT HASNT WRITTEN"). Dropped: the scene kind this item serves is deleted.
