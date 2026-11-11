---
id: tests-journal-margin-and-narration-once-flaky-on-drawn-seeds
title: "Two director tests pass or fail by the drawn seed: the journal's race margin and narration said once"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "Merger 7, Oct 27 13:10 UTC, while rechecking scene PRs"
lead: director
milestone: play-first
claimed-at:
after:
model: opus
effort: medium
root: design-words-machine
checked: fable 2026-11-10
---

**What.** Two director tests flip with the drawn seed on clean main: journal-race-margin (the journal line after an election names the margin) and scene-narration-once (a scene's narration is said once, never repeated). Merger 7 saw both while rechecking #6260 and #6201. A test that passes on one seed and fails on another is either reading a real defect that only some worlds show (a margin of zero, a tie, a scene re-entered) or asserting something the records do not promise. Find which on a failing seed and fix the one that is wrong, the engine if the world is wrong, the test if the expectation is; never widen the test to pass.

**Cause.** Found in code: `journalDataFromBank` in `src/english/mined/journal-bank.ts` (line 79, `for (const target of use.journal ?? [])`) puts a journal line under a field only through its use's `journal` targets, and the three margin lines on main (`journal.election-line-own-result.it-was-close`, `it-wasnt-close`, `it-was-very-close` in `data/english/parts/journal.json`) carry `"journal": []`. So no line reaches the `event:election|ownLine` field with a margin in its words, `ownRaceStages` never sees one, and journal-race-margin finds "no claimed margin checked" on any seed whose races are contested. It never was a lucky seed. The three lines say no result, so attaching them as they are would drop who won. The narration-once flip is not traced here: Fable's Nov 10 note names its lead (an 18-year-old opens knowing family only, `SG-WIRE-PEOPLE-SCHOOLMATES`, now the cause in `people-no-shared-school-or-work-between-people-at-the-start`).

**Fix.** Margin (built by the words writer's journal-race-margin pull request): eight journal lines that say both the result and the margin ("We won, but it was close.", "We lost, and it wasn't close.", "We won in a landslide."), each targeting `event:election|ownLine`, so `ownRaceStages` files each under its `won` or `lost` and `close` or `wide` stage and the journal claims a margin only where the result's totals show it. Narration-once: none here; it follows the people item named in the Cause.

**Time box.** 2 hours for the narration-once half, once its people item lands; the margin half is built.

**Rules.** One rule, all 56 places: a test draws its place and must hold in every world. Ask why: the failing seed's records answer why the margin or the repeat happened. No dice: a scene is said once because its record says it was, not because a counter was reset.

**Done when.** A second session runs both tests on main's head on the seeds that failed (named in the PR body) and on three fresh draws each, and sees every run pass. The PR body names the cause of each flip by record id, and the journal names the margin of a lost or won race in a drawn place without the test needing a lucky seed.

**You will see.** Nothing new on screen; the journal names the margin in every world and no scene repeats its narration.

**Screenshot.** Not a screen; the test output on the failing seeds in the PR body.

**Waits on.** Nothing.

**Files.** src/director/journal.ts, src/director/scene.ts, src/director/journal-race-margin.test.ts, src/director/scene-narration-once.test.ts

**Notes.** Merger 7, Oct 27 13:10 UTC: "Flaky on drawn seeds, worth a pool item: journal-race-margin, scene-narration-once." The third one it named (opening-unemployment-scope) is `tests-opening-unemployment-scope-red-on-drawn-seed`. Lead: director.

**Notes.** Evidence (wire-people-and-director, Oct 28 08:40 UTC). #6585 fixed one cause of `scene-narration-once`'s flips: a scene's lead looked the opener up, marking their name as said, without saying it, so the opening used the first name alone ("The phone rang. River has something to ask you."). That was in Echo, Utah, seed `6cb84ec8580ee76a0a2ed87871d51f4d394da78d`. The test also counted that artifact as a lead naming the opener. Since #6585, with seed `66ed52ba766be6d0873ae3c267b94d47255aa977`, the test fails on main the other way: no scene in its four places has a lead that names the opener (Keizer, Oregon, 22 scenes with an opener). The 18-year-old player now opens knowing family only (`SG-WIRE-PEOPLE-SCHOOLMATES`), so fewer people are watched; widening the watch to the household's known people still found none (54 scenes). Twin filed in error: `tests-scene-narration-once-no-lead-sample`.

**Notes.** Evidence (Words, Nov 1 21:50 UTC). `journal-race-margin.test.ts` fails on main at seed `17ce2f31491373a0682ed58cba7fc2dc5c2b7752` with "no claimed margin checked": in four drawn places (Venice, Illinois; Harrisonburg, Virginia; Rutland and Turners Falls, Massachusetts) about 50 candidates' Journals said "I lost.", "We won." or "I got elected." and none happened to pick a margin line ("It was close."), so the test had nothing to check. Why no margin line was chosen in any of them is not traced yet. Found while checking #7065.

**Notes.** Evidence (Lane 3, Nov 4 UTC). Still red on drawn seed `c256853f54d210d918a2678fcf106b512083de11` (also with Lane 3 head 3a8a08e2): "no claimed margin checked" in Antelope Hills, Wyoming; the state auditor race (3 candidates, lead 0.069) journals only "I didn't win.", with no margin to check.

**Notes (Fable's check, Nov 10, from the dropped tests-scene-narration-once-no-lead-sample).** Seed 66ed52ba766be6d0873ae3c267b94d47255aa977 draws Keizer, Oregon: 22 scenes with an opener and none whose lead names them, and widening to the household's known people still found none in 54 scenes. Since pull request 6585 an 18-year-old opens knowing family only (stopgap SG-WIRE-PEOPLE-SCHOOLMATES), which is a lead for the narration test: people-no-shared-school-or-work-between-people-at-the-start now has that cause. The merge desk also met src/director/journal-race-margin.test.ts red on main on Nov 10.
