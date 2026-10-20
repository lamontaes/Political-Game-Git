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
claimed-at: 2026-10-20T02:39:18.091Z
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

Looked at Oct 20 (claude, claude/political-game-pool-76ksvw), not finished: merging main into words/word-pack conflicts in `docs/pool/INDEX.md` (generated), `scripts/dialogue-batch/grading-bench.ts` and its test, `src/director/data/grading-profiles.json`, `src/director/civic-roles.ts`, `src/director/scheduling.ts` and `src/director/data/situation-types.json`. The director three are one disagreement: the branch and main each added a way to match a cause by a fact of its record (the branch's `causeFact` with a single `equals`, main's `causeFacts` with a list), and main also landed signing and veto scenes the branch has its own version of. A merge that reads both forms works (accept `causeFact` and `causeFacts` in `causeMatches`; keep both `volunteers` and `executive` in the civic fills). The grading-bench conflicts are the hard part: the branch rewrote the scene composition around line datapoints (`composeSceneItemsAt`) while main added per-profile composition, and `words-bench-datapoints` (claimed) and `words-bench-compose` (in a PR) are the same area. That merge needs the author of those, not a guess; I stopped before pushing anything to the branch.
