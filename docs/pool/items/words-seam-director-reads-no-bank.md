---
id: words-seam-director-reads-no-bank
title: "The director reads no bank and no worded text: scene-talk wording and the mined adapters move to the English engine"
area: words
kind: feature
priority: 1
size: M
status: claimed
claimed-by: words/narrative-seam
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-23T20:29:14.812Z
---

**What.** The CTO's Oct 19 seam ruling has the director say what happens and why by record, and the English engine say how it is said. words-narrative-seam's first step (#5614) moved conversation fitting; the rest is #5358. It moves scene-talk piece-picking into src/english/scene-talk-words.ts and the mined bank adapters from src/director/mined to src/english/mined. The director also stops reading a worded line's text: the English engine reports whether a line asks a question or hands the floor over.

**Rules.** No words in the director (CTO, Oct 19, the narrative seam): nothing under src/director imports data/english or decides by a line's text. Replace, never layer: moved code is deleted from the director, and the PR body counts the removed lines.

**Done when.** Nothing under src/director imports data/english or the moved adapters, every scene with a purpose composes byte for byte the same before and after on the same bank and world, and the director, English and dialogue-batch suites pass.

**Files.** src/director/scene-talk.ts, src/english/scene-talk-words.ts, src/english/mined/, src/english/bank-line.ts, src/director/conversation.ts

**Notes.** TODO
