---
id: words-batch-15
title: "Batch 15: every scene different, replies that move the talk on, calibrated on real exchanges"
area: words
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr: #4626
blocked-on:
after: words-pack-scene-talk
source: added with npm run pool -- add
claimed-at:
---

**What.** Batch 15 makes every scene different, with replies that move the talk on, calibrated on real exchanges. Where batch 13 proved a purpose and a result, this batch checks variety across the thirty scenes so no two read as the same talk, and that each reply answers the line before it. Compare the composed exchanges with the corpus of real exchanges and tune the bank where they diverge.

**Rules.** No hand-written player text: pieces are mined or authored under the civic-prose process and banked as data, never typed into a screen. Research before building: the calibration cites the real exchanges it was checked against, as a check and never as the outcome.

**Done when.** The batch page lists thirty scenes composed in a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, no two sharing an opener or a close, each with its cause record id, and the English banks test passes.

**Files.** docs/grading/words-batch-15.md, scripts/dialogue-batch/, data/english/parts/

**Notes.** TODO

Sent back 2026-10-16 from PR #4626 (branch words/word-pack): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4626 (branch words/word-pack): The top of the PR body has no named in-session changed-file checks and result. Move the existing check results to the top, then request another merger pass.; finish on that branch, merge main into it first.

Sent back 2026-10-19 from PR #4626 (branch words/word-pack): No in-session changed-file gate result near the top of the PR body; finish on that branch, merge main into it first.
Sent back 2026-10-19 from PR #4626 (branch words/word-pack): merging main conflicts in the grading bench, civic-roles, scheduling and two director data files; finish on that branch, merge main into it first.

Tried Oct 20 (claude, Sonnet), released unchanged: merging main into words/word-pack conflicts in more than pool docs. Code conflicts are a real divergence between two builds of the same feature, not text overlap: scheduling.ts has the branch's `causeFact`/`occasion` matcher against main's `causeFacts` list plus `selfNamed`; civic-roles.ts has 'volunteers' against 'executive' in the same list; grading-bench.ts (4 hunks) and grading-bench.test.ts, src/director/data/grading-profiles.json (3 hunks) and situation-types.json (5 hunks, 3,609 lines) all changed on both sides. One side's matcher has to win and the other's bank rows be re-keyed to it, which is the Words line's decision (Opus session). The four pool-doc conflicts resolve by taking main.
