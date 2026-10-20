---
id: words-speech-part-words
title: "The English engine words a speech part from its move and facts"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-7xkkii
pr: #5196
blocked-on:
source: "split from gov-next, Oct 16"
claimed-at: 2026-10-19T21:58:19.907Z
---

**What.** The engine builds a speech one part at a time (an opening, body parts, a close), and each part names its move (open, stance, record, contrast, town, close), its question, its position and the record ids it rests on, but carries no words (`src/core2/speech-composition.ts`). Write the adapter that gives each part to the English engine's address register for its move and fills the slots from the part's facts, so the four offered parts and the finished speech can be shown in words. Pieces missing for a move are authored to the calibrated patterns, never typed into code.

**Rules.** No hand-written player text: words come from the banks in data/english/parts through the engine, with origin and author on any authored piece. Ask why: each part's words cite the record ids it rests on. Speeches are built as the player gives them: short openers and closers, longer body parts on different subjects.

**Done when.** In a drawn place and seed (named in the PR body) a candidate's four offered parts at each of the three steps all come back as words, each citing its record ids, a finished speech reads as one speech through the address register, and the test beside src/core2/speech-composition.test.ts and the english bank tests pass.

**Files.** src/english/english-composition.ts, src/core2/speech-composition.ts, data/english/parts/address.json

**Notes.** Split from gov-next. The owner's rally choice set (batch 11) is the shape to build on.
