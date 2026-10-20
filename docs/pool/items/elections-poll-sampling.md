---
id: elections-poll-sampling
title: "Poll sampling and ballot foundations (B07 P4, #2486)"
area: elections
kind: feature
priority: 2
status: dropped
claimed-by:
pr: #5091
blocked-on:
milestone:
source: "open PR #2486"
claimed-at:
---

**What.** Poll sampling and ballot foundations (B07 P4, #2486). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in data/research/money/poll-interview-prices.json, src/simulation/election-contests.ts and src/simulation/types.ts (code, left for the author); resolve and push. Finish it on the existing branch session29-b07-p4, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/elections-poll-sampling.md and the files that pull request #2486 changes on session29-b07-p4

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #2486 (branch session29-b07-p4): merging main conflicts in data/research/money/poll-interview-prices.json, src/simulation/election-contests.ts and src/simulation/types.ts (code, left for the author); resolve and push; finish on that branch, merge main into it first.
PR #5091 closed unmerged (2026-10-19); reopened by the pool reconcile Oct 19.
Dropped by the pool reconcile Oct 19 (audit-2026-10-19; OWNER-DECISIONS Oct 19 evening, Superseded elections items): old-engine branch; elections-polls-core2 replaces it.
