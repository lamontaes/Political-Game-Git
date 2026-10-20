---
id: words-batch-13
title: "Batch 13: thirty scenes with a purpose, each a full exchange"
area: words
kind: feature
priority: 1
size: M
status: in-pr
claimed-by:
pr: #4459
blocked-on:
after: words-scene-talk
source: owner, Oct 15, evening: batch 12 rejected; what a scene is
claimed-at:
---

**What.** Batch 13 is thirty scenes with a purpose, each a full exchange, graded from one cached world once the exchange engine exists. A scene is a person who wants something, what is at stake and an exchange that reaches a result, and the owner rejected batch 12 for scenes that did not. Stage thirty situations from the played world, render each as an exchange, and write the grading page for the owner.

**Rules.** No hand-written player text: every line is composed by the English engine from banked pieces, never typed into the batch page. Ask why: each scene's page names the record that fired it and the reasons behind each reply.

**Done when.** The grading page docs/grading/words-batch-13.md lists thirty scenes composed in a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, each with its cause record id, and the batch test passes after merging main into the branch.

**Files.** docs/grading/words-batch-13.md, scripts/dialogue-batch/, data/english/parts/

**Notes.** TODO

Session handed off Oct 15, 2026: branch words/scene-talk (PR #4459) has the catalog and bank this builds on; docs/grading/words-batch-13.md is not written; remainder: 30 scenes from one cached world once the exchange engine exists.

Sent back 2026-10-16 from PR #4459 (branch words/scene-talk): merging main conflicts in data/english/parts/journal.json, data/english/parts/scene-words.json, src/director/conversation.ts, src/director/data/journal-rows.json, src/director/data/scene-rows.json, src/director/scene.ts, src/director/words.ts, tests/english-parts-banks.test.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4459 (branch words/scene-talk): Sent back by the merger: merging main conflicts in data/english/parts/journal.json, data/english/parts/scene-words.json, src/director/conversation.ts, src/director/data/journal-rows.json, src/director/data/scene-rows.json, src/director/scene.ts, src/director/words.ts, tests/english-parts-banks.test.ts (code or data, left for the author); resolve and push Finish on this branch (merge main into it first), then it goes back in line; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4459 (branch words/scene-talk): Merging current main (a1f2c29d2) into words/scene-talk (4503ac52d) conflicts in data/english/parts/conversation.json, data/english/parts/scene-words.json, data/english/parts/speech-stages.json, package.json, src/director/conversation.test.ts, src/director/data/scene-rows.json, src/director/data/situation-types.json, src/director/mined/conversation-bank.test.ts, src/director/mined/conversation-bank.ts, src/director/mined/scene-bank.ts, src/director/scene.ts, src/director/world-moments.test.ts. Resolve these code/data conflicts on this branch and push; the merger cannot resolve code conflicts or run checks on an unresolved merge. Move the existing named in-session check results to the top of the PR body as its gate line; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4459 (branch words/scene-talk): merging main conflicts in data/english/parts/bring-it-up.json, data/english/parts/conversation.json, data/english/parts/journal.json, data/english/parts/scene-words.json, data/english/parts/speech-stages.json, docs/grading/coverage.md, package.json, scripts/dialogue-batch/grading-bench.test.ts, scripts/dialogue-batch/grading-bench.ts, scripts/english-corpus/moves.json, src/director/conversation.test.ts, src/director/conversation.ts, src/director/data/scene-rows.json, src/director/data/situation-types.json, src/director/mined/conversation-bank.test.ts, src/director/mined/conversation-bank.ts, src/director/mined/scene-bank.ts, src/director/scene.ts, src/director/world-moments.test.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4459 (branch words/scene-talk): The top of the PR body has no named in-session changed-file checks and result. Move the existing check results to the top, then request another merger pass.; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4459 (branch words/scene-talk): The gate line and main-merge issues are fixed, but scripts/dialogue-batch/grading-bench.test.ts deletes the existing generated-world staging test and both regression tests for missing cause records/raw IDs/missing cast records. The replacement tests cover deduplication and calibration, not those safety contracts; grading-bench.ts still contains those production responsibilities. Port the existing assertions to the replacement cached-world staging path: every catalog type is staged or reports why, every staged scene has a cause and nonempty recorded cast, and invalid IDs/cast are reported. Keep the new tests as well; do not remove this coverage to land the replacement.; finish on that branch, merge main into it first.

Sent back 2026-10-19 from PR #4459 (branch words/scene-talk): Merge main conflicts require author resolution: data/english/parts/scene-words.json, scripts/dialogue-batch/coverage-table.test.ts; finish on that branch, merge main into it first.
Sent back 2026-10-19 from PR #4459 (branch words/scene-talk): merge conflicts in data/english and scripts/english-corpus/moves.json; finish on that branch, merge main into it first.
