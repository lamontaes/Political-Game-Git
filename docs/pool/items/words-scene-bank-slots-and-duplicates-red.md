---
id: words-scene-bank-slots-and-duplicates-red
title: "The part-bank test is red on main: scene-talk uses 13 undeclared slots and repeats three texts"
area: words
kind: bug
priority: 1
size: S
lead: words
status: done
claimed-by: words/scene-bank-slots-and-duplicates
pr: #6747
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T05:47:31.206Z
---

**What.** tests/english-parts-banks.test.ts fails on main 64b0dca33f in two cases for data/english/parts/scene-talk.json. Uses only declared slots: 13 slots the bank's slots map does not declare (all, ayes, cast, companion, count, in, leader, margin, nays, number, reached, required, trail), brought in by today's folds (election night #6742, the filing counter #6743, the vote figures #6744). Validates against the bank schema: three texts appear twice (Thank you., Good luck with it., Understood. Take care.), from the signature door #6738 and the filing counter #6743. CI runs only changed test files, so neither PR ran it.

**Rules.** No hand-written player text in code, and every bank piece is a sentence with declared slots the English engine fills from records (scene-standard); a text says one thing once per bank, so a sentence two purposes share is one piece with two uses.

**Done when.** tests/english-parts-banks.test.ts passes on main (77 of 77), the scene-talk bank declares every slot its pieces use with what record fills it, and each repeated text is one piece carrying both uses; the test is named in the PR with its result.

**Files.** data/english/parts/scene-talk.json

**Notes.** TODO
