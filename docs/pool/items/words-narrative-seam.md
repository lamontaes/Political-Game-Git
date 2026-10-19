---
id: words-narrative-seam
title: "Piece-picking moves from the director's scene-talk into the English engine; the director emits only the situation and the moves"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: words-pack-scene-talk
source: added with npm run pool -- add
---

**What.** `src/director/scene-talk.ts` picks pieces from `data/english/parts/scene-talk.json` itself, so the director both decides what happens and chooses the words. The CTO ruled that the director and the English engine are two layers under one contract, and this is the one place the seam is blurred. Move the piece-picking into the English engine so the director only emits the situation, the roles, the stakes and the moves at each turn.

**Rules.** The director says what is happening and why, by record (roles, purpose, stakes, the move at each turn, the facts by record id), with no words; the English engine fills each move. Replace, never layer: delete what moved and count it in the PR body.

**Done when.** `src/director/` reads nothing under `data/english/`, the scene-talk test and the review page build pass unchanged, a review page staged from a played world reads the same, and the PR body counts the removed lines.

**Files.** `src/director/scene-talk.ts`, `src/english/`.

**Notes.** CTO, Oct 19, "the narrative seam" in `docs/coordination/OWNER-DECISIONS.md`. Its own PR, after #4626.
