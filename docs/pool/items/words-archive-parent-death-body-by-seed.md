---
id: words-archive-parent-death-body-by-seed
title: "An archived parent's death has no story body in some worlds (Arizona, seed e7e726151bec8679)"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/bench/archive-words.test.ts fails on main (5cb91c07b3) at ARCHIVE_WORDS_SEED=e7e726151bec8679 (place 0425735, Arizona): the world archived one parent-died story and it has no body ('parent-died in 0425735: expected 0 to be greater than 0'). The death is told only by its lede when the fact carries no relation or survivor. Found by Words on Nov 2 while checking words-paper-law-and-budget-briefs-read-right.

**Rules.** No hand-written player text: the death's body comes from the bank and its records, never a filler sentence. Red by seed is red. A story's body comes from its records (the survivor, the relation, the age from the parent's record); no filler sentence.

**Done when.** The test src/bench/archive-words.test.ts passes at ARCHIVE_WORDS_SEED=e7e726151bec8679 (place 0425735, Arizona) and on three fresh drawn place seeds named in the PR body, the death's body citing its record by id.

**Files.** src/bench/printed-words.ts, src/core2/past-news.ts

**Notes.** TODO
