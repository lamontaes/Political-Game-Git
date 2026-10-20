---
id: words-scene-endpoints
title: "Every scene has an endpoint, stated on the batch page"
area: words
kind: feature
priority: 1
status: open
claimed-by:
pr: #4612
blocked-on:
milestone:
source: "owner, Oct 15 evening, batch 11 grading"
claimed-at:
---

**What.** Every scene has an endpoint, stated on the batch page. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in src/director/conversation.test.ts (code or data, left for the author); resolve and push. Finish it on the existing branch claude/words-scene-endpoints, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/words-scene-endpoints.md and the files that pull request #4478 changes on claude/words-scene-endpoints

Sent back 2026-10-16 from PR #4478 (branch claude/words-scene-endpoints): Sent back by the merger: merging main conflicts in src/director/conversation.test.ts (code or data, left for the author); resolve and push Finish on this branch (merge main into it first), then it goes back in line; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4478 (branch claude/words-scene-endpoints): Merging current main into claude/words-scene-endpoints conflicts in scripts/dialogue-batch/coverage-batch.ts, src/director/conversation.test.ts. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4612 (branch claude/words-scene-endpoints-2): merging main conflicts in scripts/dialogue-batch/coverage-batch.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4612 (branch claude/words-scene-endpoints-2): Merging current main (e18e2bf262) conflicts in scripts/dialogue-batch/coverage-batch.ts. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-19 from PR #4612 (branch claude/words-scene-endpoints-2): Merge main conflicts require author resolution: scripts/dialogue-batch/coverage-batch.ts; finish on that branch, merge main into it first.
Sent back 2026-10-19 from PR #4478 (branch claude/words-scene-endpoints): it commits tsconfig.tsbuildinfo and a compiled tooling/root-tsconfig-guard.js; remove both, merge main into it first, then finish.
