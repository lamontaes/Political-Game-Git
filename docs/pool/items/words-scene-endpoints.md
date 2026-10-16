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
