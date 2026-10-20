---
id: words-authored-parts-shippable-sweep
title: "Mark every authored part not shippable until graded, and make the bank test refuse one that is"
area: words
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/fs11vb-flip
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T09:58:13.442Z
---

**What.** The merge audit set authored journal lines to not shippable until graded, but data/english/parts still holds authored parts marked shippable in scene-words.json (78), speech-stages.json (21), newspaper-ledes.json (6), bring-it-up.json (4), conversation.json (2) and news.json (2) on main, with more on open branches. Flip them and add a bank test that fails on any part with origin authored and shippable true that has no recorded grade. The director skips parts that are not shippable, so these lines stay out of play until a grading batch.

**Rules.** No hand-written player text: authored words stay out of play until graded. Replace, never layer: the test replaces the one-off audit fixes. American English.

**Done when.** tests/english-parts-banks.test.ts fails on an authored part marked shippable without a grade, passes on main after the flips, and the PR body lists the count flipped per bank file with the test output.

**Files.** data/english/parts/, tests/english-parts-banks.test.ts

**Notes.** Found while fixing the #5187, #5219 and #5233 send-backs (PRs 5523, 5525, 5528). Overlaps release-audit-05-journal-lines-not-shippable for the journal bank only.

Tried Oct 20 (claude/political-game-pool-3xfqef-16, branch pushed with the bank test only, no PR): flipped all 141 authored shippable parts to not shippable (bring-it-up 4, conversation 2, journal 28, news 2, newspaper-ledes 6, scene-words 78, speech-stages 21; none has a good grade in `part-grades.json`) and added `gradeProblems` to `tests/english-parts-banks.test.ts` (an authored part is shippable only with a good grade and not held; a unit case and a per-bank case). The bank test fails on main's data in all 7 banks and passes after the flips (108 tests). The flips are not safe to merge as they stand: running `src/english` and `src/director` with them fails 20 director tests that need those lines in play (birth-scenes, bring-it-up-law, bring-it-up-press, hearing-scenes, journal-household, journal-office, journal-revision, journal, office-scene, press-scenes, scene-leads, scene, school-answers, speech-builder), against one failure already on main (`director.test.ts` "registers every stopgap it marks and keeps numbers in data"). Every bank loader filters on `shippable` and there is no test-only way to include an ungraded part. The choice is the owner's: grade these lines in a batch first (then nothing flips), or flip them and have those scene and journal tests stand on mined or graded parts only. A builder can redo the flips with one script (set shippable false where origin is authored and the key has no good grade) and re-run the director tests.

Oct 20 (pool feeder, acting CTO ruling): flip all 141 authored parts to not shippable, as the merge audit and the fixer PRs already do (no hand-written player text). Rewrite the 20 director tests to assert on mined or graded parts, or that the scene stays out of play while its only line is ungraded. Add the 141 lines to the next owner grading batch through a Words-line item. Grading stays the owner's, and this item does not wait on it.
