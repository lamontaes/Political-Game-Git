---
id: words-scene-talk
title: "Scenes with a purpose: a person wants something, the stakes, an exchange to a result"
area: words
kind: feature
priority: 1
size: L
status: claimed
claimed-by: claude/words-scene-talk
pr: #4459
blocked-on:
source: owner, Oct 15, evening: batch 12 rejected; what a scene is
claimed-at: 2026-10-20T20:20:35.296Z
---

**What.** Scenes with a purpose: a person wants something, the stakes are clear, and an exchange runs to a result. Fix the root of talk openings so no opener appears without a long-ago record behind it and a yes or no is always followed up. Build the exchange engine with its fifteen-talk test, then batch 13 on top of it.

**Rules.** No hand-written player text: every opener and reply is composed by the English engine from banked pieces. Ask why: each opener cites the record that earns it, and a talk with no record opens without a claim about the past.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, fifteen talks run to a result with no unearned opener and every yes or no followed up, shown by a test beside src/director/conversation.test.ts naming the scene and record ids.

**Files.** src/director/conversation.ts, src/director/scene.ts, data/english/parts/, scripts/dialogue-batch/

**Notes.** TODO

Session handed off Oct 15, 2026: PR #4459 (words/scene-talk, draft) has the catalog (14 types), purpose arcs and the 250-piece scene-talk bank, school opener off; remainder: the root fix of talk openings (no opener without a long-ago record, yes/no always followed up), the exchange engine with its 15-talk test, then batch 13.

Sent back 2026-10-16 from PR #4459 (branch words/scene-talk): Sent back by the merger: merging main conflicts in data/english/parts/journal.json, data/english/parts/scene-words.json, src/director/conversation.ts, src/director/data/journal-rows.json, src/director/data/scene-rows.json, src/director/scene.ts, src/director/words.ts, tests/english-parts-banks.test.ts (code or data, left for the author); resolve and push Finish on this branch (merge main into it first), then it goes back in line; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4459 (branch words/scene-talk): Merging current main (a1f2c29d2) into words/scene-talk (4503ac52d) conflicts in data/english/parts/conversation.json, data/english/parts/scene-words.json, data/english/parts/speech-stages.json, package.json, src/director/conversation.test.ts, src/director/data/scene-rows.json, src/director/data/situation-types.json, src/director/mined/conversation-bank.test.ts, src/director/mined/conversation-bank.ts, src/director/mined/scene-bank.ts, src/director/scene.ts, src/director/world-moments.test.ts. Resolve these code/data conflicts on this branch and push; the merger cannot resolve code conflicts or run checks on an unresolved merge. Move the existing named in-session check results to the top of the PR body as its gate line; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4459 (branch words/scene-talk): The top of the PR body has no named in-session changed-file checks and result. Move the existing check results to the top, then request another merger pass.; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4459 (branch words/scene-talk): The gate line and main-merge issues are fixed, but scripts/dialogue-batch/grading-bench.test.ts deletes the existing generated-world staging test and both regression tests for missing cause records/raw IDs/missing cast records. The replacement tests cover deduplication and calibration, not those safety contracts; grading-bench.ts still contains those production responsibilities. Port the existing assertions to the replacement cached-world staging path: every catalog type is staged or reports why, every staged scene has a cause and nonempty recorded cast, and invalid IDs/cast are reported. Keep the new tests as well; do not remove this coverage to land the replacement.; finish on that branch, merge main into it first.

Sent back 2026-10-19 from PR #4459 (branch words/scene-talk): Merge main conflicts require author resolution: data/english/parts/scene-words.json, scripts/dialogue-batch/coverage-table.test.ts; finish on that branch, merge main into it first.
Sent back 2026-10-19 from PR #4459 (branch words/scene-talk): merge conflicts in data/english and scripts/english-corpus/moves.json; finish on that branch, merge main into it first.

Fixer, Oct 20 (PR #4459, branch words/scene-talk): handed back for a Words-line design call. Main now has its own calibration engine (src/english/english-calibration.ts, data/english/calibration.json, commit fc129ba79e) and a different grading-profile schema, so merging main conflicts in 11 files; keep one engine (suggested: main's english-calibration.ts, porting this branch's trait and move-pair weights, which pool item words-calibration-traits-pairs-replies asks for) and finish on the branch.
