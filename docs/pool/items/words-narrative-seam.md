---
id: words-narrative-seam
title: "Piece-picking moves from the director's scene-talk into the English engine; the director emits only the situation and the moves"
area: people
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/narrative-seam
pr: #5358
blocked-on:
after: words-pack-scene-talk
source: added with npm run pool -- add
claimed-at: 2026-10-20T09:10:24.618Z
---

**What.** Piece-picking moves out of the director's scene-talk into the English engine: the director says which move each turn makes, who makes it, the line it answers and the facts on record, and src/english/scene-talk-words.ts picks the piece and words it. The bank renderer, the speech-stage pieces, the office scene's mined sentences, the mined-bank adapters and the policy names move from src/director to src/english, so nothing under src/director imports data/english. PR #5358 (branch words/narrative-seam) built it but was sent back with merge conflicts in seven code files and a base branch (words/word-pack, #4626) that is not merged. Finish it after words-pack-scene-talk lands: retarget the PR to main, merge main in and resolve the conflicts.

**Rules.** No hand-written player text: every word the director stages comes from the English engine, and the director keeps only the situation and the moves. Replace, never layer: the moved files are deleted from src/director, not copied, and the PR body counts what was removed. Ask why: any changed output after the move is a defect that names its cause.

**Done when.** Every scene-with-a-purpose type composes byte for byte the same before and after the move, with and without a caught lie, shown by a test that compares the two outputs; in a one-year run of the played world (buildBenchWorld, a drawn place and seed named in the PR body) the scenes, journal and conversations still render; and a grep test fails if any file under src/director imports data/english.

**Files.** src/director/scene-talk.ts, src/english/scene-talk-words.ts, src/english/bank-line.ts, src/english/speech-stage-words.ts, src/english/mined-part-words.ts, src/english/policy-names.ts, data/english/scene-talk-tags.json

**Notes.** PR #5358 sent back: merge conflict with main in code files (scripts/dialogue-batch/apply-grades.ts, scripts/dialogue-batch/grading-bench.test.ts, scripts/dialogue-batch/grading-bench.ts, src/director/civic-roles.ts, src/director/conversation.test.ts, src/director/scheduling.ts, src/english/english-composition.ts) and targets unmerged base branch words/word-pack (#4626).
