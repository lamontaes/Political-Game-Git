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

**What.** Piece-picking moves from the director's scene-talk into the English engine. The director emits only the situation and the moves, and the English engine chooses the parts and words them. Today the director picks pieces itself, which puts wording decisions in two places. After the move the director holds no sentence parts, and the English engine is the one place that words a scene.

**Rules.** No hand-written player text: the director holds no sentence parts after this change; Replace, never layer: the director's piece-picking code and data are deleted in the same change, and the PR body counts what was removed; An effect is a read, not a record: the English engine reads the situation and moves at the moment it words the scene; One rule, all 56 places: nothing names a place.

**Done when.** Scenes staged in a played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, named in the PR body, are worded through the English engine from the director's situation and moves, the old piece-picking is gone, and the director and English tests in src/director pass.

**Files.** src/director/conversation.ts, src/director/words.ts, src/english/english-composition.ts

**Notes.** Body written Oct 19 (claude) from the title and the repo layout; the claimant should sharpen it.
