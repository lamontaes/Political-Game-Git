---
id: tests-journal-margin-and-narration-once-flaky-on-drawn-seeds
title: "Two director tests pass or fail by the drawn seed: the journal's race margin and narration said once"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "Merger 7, Oct 27 13:10 UTC, while rechecking scene PRs"
lead: director
milestone: play-first
claimed-at:
---

**What.** Two tests under the director flip with the drawn seed on clean main: `journal-race-margin` (the journal line after an election names the margin) and `scene-narration-once` (a scene's narration is said once, never repeated). Merger 7 saw both while rechecking #6260 and #6201. A test that passes on one seed and fails on another is either reading a real defect that only some worlds show (a margin of zero, a tie, a scene re-entered) or asserting something the records do not promise. Find which on a failing seed and fix the one that is wrong: the engine if the world is wrong, the test if the expectation is; never widen the test to pass.

**Rules.** One rule, all 56 places: a test draws its place and must hold in every world. Ask why: the failing seed's records answer why the margin or the repeat happened. No dice: a scene is said once because its record says it was, not because a counter was reset.

**Done when.** Both tests pass on main's head on the seeds that failed (named in the PR body) and on three fresh draws each, and the PR body names the cause of each flip.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Nothing new on screen; the journal names the margin in every world and no scene repeats its narration.

**Screenshot.** Not a screen; the test output on the failing seeds in the PR body.

**Files.** src/director/journal.ts, src/director/scene.ts, the two test files that carry those names

**Notes.** Merger 7, Oct 27 13:10 UTC: "Flaky on drawn seeds, worth a pool item: journal-race-margin, scene-narration-once." The third one it named (opening-unemployment-scope) is `tests-opening-unemployment-scope-red-on-drawn-seed`. Lead: director.
