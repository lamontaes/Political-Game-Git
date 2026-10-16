---
id: release-green-suite
title: "Finish #4309: the unit suite follows what the game does now"
area: release
kind: cleanup
priority: 2
status: open
claimed-by:
pr: #4309
blocked-on:
milestone:
source: "astra order 2; PR #4309 branch release/green-suite"
claimed-at:
---

**What.** Finish #4309: the unit suite follows what the game does now. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in data/content/trait-coverage.json, data/english/parts/journal.json, data/english/parts/newspaper-ledes.json, data/english/parts/notice.json, scripts/dialogue-batch/coverage-batch.ts, src/core2/finance-day-order.test.ts, src/director/opening-story.test.ts (code or data, left for the author); resolve and push. Finish it on the existing branch release/green-suite, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/release-green-suite.md and the files that pull request #4309 changes on release/green-suite

**Notes.** #4316 (release contract test) already merged. Overlaps #4354.

Sent back 2026-10-16 from PR #4309 (branch release/green-suite): merging main conflicts in data/content/trait-coverage.json, data/english/parts/journal.json, data/english/parts/newspaper-ledes.json, data/english/parts/notice.json, scripts/dialogue-batch/coverage-batch.ts, src/core2/finance-day-order.test.ts, src/director/opening-story.test.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
