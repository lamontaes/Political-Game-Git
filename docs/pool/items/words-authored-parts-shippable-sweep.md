---
id: words-authored-parts-shippable-sweep
title: "Mark every authored part not shippable until graded, and make the bank test refuse one that is"
area: words
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/political-game-pool-3xfqef-16
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:10:38.408Z
---

**What.** The merge audit set authored journal lines to not shippable until graded, but data/english/parts still holds authored parts marked shippable in scene-words.json (78), speech-stages.json (21), newspaper-ledes.json (6), bring-it-up.json (4), conversation.json (2) and news.json (2) on main, with more on open branches. Flip them and add a bank test that fails on any part with origin authored and shippable true that has no recorded grade. The director skips parts that are not shippable, so these lines stay out of play until a grading batch.

**Rules.** No hand-written player text: authored words stay out of play until graded. Replace, never layer: the test replaces the one-off audit fixes. American English.

**Done when.** tests/english-parts-banks.test.ts fails on an authored part marked shippable without a grade, passes on main after the flips, and the PR body lists the count flipped per bank file with the test output.

**Files.** data/english/parts/, tests/english-parts-banks.test.ts

**Notes.** Found while fixing the #5187, #5219 and #5233 send-backs (PRs 5523, 5525, 5528). Overlaps release-audit-05-journal-lines-not-shippable for the journal bank only.
