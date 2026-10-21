---
id: release-green-suite
title: "Finish #4309: the unit suite follows what the game does now"
area: release
kind: cleanup
priority: 2
status: in-pr
claimed-by: release/green-suite
pr: #4309
blocked-on:
milestone:
source: "astra order 2; PR #4309 branch release/green-suite"
claimed-at: 2026-10-19T22:02:24.399Z
---

**What.** Finish #4309: the unit suite follows what the game does now. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in data/content/trait-coverage.json, data/english/parts/journal.json, data/english/parts/newspaper-ledes.json, data/english/parts/notice.json, scripts/dialogue-batch/coverage-batch.ts, src/core2/finance-day-order.test.ts, src/director/opening-story.test.ts (code or data, left for the author); resolve and push. Finish it on the existing branch release/green-suite, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/release-green-suite.md and the files that pull request #4309 changes on release/green-suite

**Notes.** #4316 (release contract test) already merged. Overlaps #4354.

Sent back 2026-10-16 from PR #4309 (branch release/green-suite): merging main conflicts in data/content/trait-coverage.json, data/english/parts/journal.json, data/english/parts/newspaper-ledes.json, data/english/parts/notice.json, scripts/dialogue-batch/coverage-batch.ts, src/core2/finance-day-order.test.ts, src/director/opening-story.test.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4309 (branch release/green-suite): Merging current main (637f32fe12) conflicts in art/manifest/cargo_disposition.json, data/content/trait-coverage.json, data/content/trait-decisions.json, data/english/parts/journal.json, data/english/parts/newspaper-ledes.json, data/english/parts/notice.json, scripts/audit/research-data-allowlist.json, scripts/dialogue-batch/coverage-batch.ts, scripts/zero-dice-allowlist.json, src/core2/finance-day-order.test.ts, src/core2/trait-coverage.test.ts, src/director/opening-story.test.ts, src/director/world-moments.test.ts, src/simulation/campaigns.ts, src/simulation/nationwide-world/state-legislature-queue.ts, src/simulation/trait-packs.test.ts, tests/asset-bank-inventory.test.ts, tests/guards/research-data-has-reader.test.ts, tests/release/validate-workflow.test.ts. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-19 from PR #4309 (branch release/green-suite): Merge main conflicts require author resolution: art/manifest/cargo_disposition.json, data/content/trait-coverage.json, data/content/trait-decisions.json, data/english/parts/journal.json, data/english/parts/newspaper-ledes.json, data/english/parts/notice.json, data/research/powers-catalog/placeholder-ledger.json, scripts/audit/research-data-allowlist.json, scripts/dialogue-batch/coverage-batch.ts, scripts/zero-dice-allowlist.json, src/core2/finance-day-order.test.ts, src/core2/trait-coverage.test.ts, src/director/opening-story.test.ts, src/director/world-moments.test.ts, src/simulation/campaigns.ts, src/simulation/nationwide-world/state-legislature-queue.ts, src/simulation/trait-packs.test.ts, tests/asset-bank-inventory.test.ts, tests/guards/research-data-has-reader.test.ts, tests/release/validate-workflow.test.ts; finish on that branch, merge main into it first.

Checked 2026-10-19 (claude/political-game-pool-3xfqef): release/green-suite is 6,522 commits behind main with 20 conflicts across a 57-file sweep; the merge is not worth salvaging. A builder should restart from main: run the unit suite on changed areas, list the tests that fail on clean main today, and fix those at the root (one pool item per cluster).
