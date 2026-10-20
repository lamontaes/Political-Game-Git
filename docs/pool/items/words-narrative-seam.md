---
id: words-narrative-seam
title: "Piece-picking moves from the director's scene-talk into the English engine; the director emits only the situation and the moves"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr: #5358
blocked-on:
after: words-pack-scene-talk
source: added with npm run pool -- add
claimed-at:
---

**What.** Piece-picking moves from the director's scene-talk into the English engine. The director should emit only the situation and the moves, and the English engine should choose the pieces that voice each move. Today the director's scene-talk picks the words, which splits the wording between two places.

**Rules.** Replace, never layer: the piece-picking code in the director's scene-talk is deleted in the same change. No hand-written player text: words come from the English engine.

**Done when.** Scenes in a one-year run of the played world (buildBenchWorld) in a drawn place and seed the builder did not choose read the same on the batch page as before, the director emits only situation and moves by record id, the old piece-picking code in src/director/conversation.ts is gone with the line count in the PR body, and src/director and src/english tests pass.

**Files.** src/director/conversation.ts, src/english/english-composition.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
