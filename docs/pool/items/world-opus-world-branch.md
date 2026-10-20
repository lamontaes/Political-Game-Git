---
id: world-opus-world-branch
title: "OPUS-WORLD economy engines branch (#3996)"
area: world
kind: feature
priority: 2
status: dropped
claimed-by:
pr: #3996
blocked-on:
milestone:
source: "open PR #3996"
claimed-at:
---

**What.** OPUS-WORLD economy engines branch (#3996). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in src/core2/jobs-closure.test.ts, src/core2/modules/housing.ts (code or data, left for the author); resolve and push. Finish it on the existing branch opus-world, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/world-opus-world-branch.md and the files that pull request #3996 changes on opus-world

**Notes.** Read the PR body and any CTO comment first.
Sent back 2026-10-15 from PR #3996 (branch opus-world): code conflict with main in src/core2/modules/housing.ts, src/core2/data/stopgaps.json, housing.ts; finish on that branch, merge main into it first. (PR references as of 2026-10-15.)

Sent back 2026-10-16 from PR #3996 (branch opus-world): merging main conflicts in src/core2/jobs-closure.test.ts, src/core2/modules/housing.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
PR #3996 closed unmerged (2026-10-16); reopened by the pool reconcile Oct 19.
Dropped by the pool reconcile Oct 19 (audit-2026-10-19): owner closed #3996 on Oct 16; superseded on core2.
