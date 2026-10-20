---
id: words-pack-scene-talk
title: "Word pack: the scene-talk pieces the owner kept, folded and calibrated on real exchanges"
area: words
kind: feature
priority: 1
size: M
status: claimed
claimed-by: words/word-pack
pr: #4626
blocked-on:
after: words-scene-talk
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:41:49.861Z
---

**What.** Word pack: the scene-talk pieces the owner kept, folded into the bank and calibrated on real exchanges. The owner kept some pieces from the rejected batches, and they must live in the bank as data so scenes can use them. Fold the kept pieces into data/english/parts with their moves, registers and bearings, and calibrate their use on the corpus.

**Rules.** No hand-written player text: the pieces live in the English banks as data and are rendered by the engine, never typed into code or a screen. Research before building: calibration cites the real exchanges it was checked against.

**Done when.** The kept pieces are in data/english/parts by move, register and bearing, a test in tests/english-parts-banks.test.ts lists them, and a played world (buildBenchWorld) in a drawn place composes a scene from them with the record id that fired it.

**Files.** data/english/parts/, tests/english-parts-banks.test.ts, scripts/dialogue-batch/

**Notes.** TODO

Sent back 2026-10-16 from PR #4626 (branch words/word-pack): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4626 (branch words/word-pack): The top of the PR body has no named in-session changed-file checks and result. Move the existing check results to the top, then request another merger pass.; finish on that branch, merge main into it first.

Sent back 2026-10-19 from PR #4626 (branch words/word-pack): No in-session changed-file gate result near the top of the PR body; finish on that branch, merge main into it first.
Sent back 2026-10-19 from PR #4626 (branch words/word-pack): same conflicts as words-batch-15; finish on that branch, merge main into it first.
