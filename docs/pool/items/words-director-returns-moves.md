---
id: words-director-returns-moves
title: "The director stops picking bank wordings for talks, the journal, scenes, bring-it-up and the filing visit"
area: words
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** After the seam (#5358), scenes with a purpose work the way the CTO's Oct 19 seam ruling asks: the director emits each turn's move with its facts and records, and src/english/scene-talk-words.ts picks and words the piece. Five director files still hold the bank's wordings themselves. src/director/conversation.ts, journal.ts, scene.ts, bring-it-up.ts and filing-visit.ts call the English engine's bank adapters (conversationDataFromBank, journalDataFromBank, sceneWordsFromBank, bringDataFromBank, filingWordsFromBank in src/english/mined/) and renderLine from src/english/bank-line.ts, so the director chooses among worded variants. Move each one the way scene-talk moved: the director returns moves, facts and record ids, and the English engine words them.

**Rules.** No words in the director (CTO, Oct 19, the narrative seam): nothing under src/director picks a wording or decides by a line's text, and the English engine says how each move is said. Replace, never layer: the director's wording code is deleted in the same change, and the PR body counts the removed lines.

**Done when.** Nothing under src/director imports src/english/mined or renderLine; in a played world (buildBenchWorld) in a drawn place, every conversation, journal entry, scene lead, bring-it-up line and filing visit composes byte for byte the same before and after on the same bank; and the director, English and dialogue-batch suites pass.

**Files.** src/director/conversation.ts, src/director/journal.ts, src/director/scene.ts, src/director/bring-it-up.ts, src/director/filing-visit.ts, src/english/mined/

**Notes.** Builds on #5358. Split into one sub-item per file before building (an L item).
