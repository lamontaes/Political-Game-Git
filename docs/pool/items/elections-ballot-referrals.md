---
id: elections-ballot-referrals
title: "Certified ballot referrals and named tally (b18-p3, #2497)"
area: elections
kind: feature
priority: 2
status: dropped
claimed-by:
pr: #5081
blocked-on:
milestone:
source: "open PR #2497"
claimed-at:
---

**What.** Certified ballot referrals and named tally (b18-p3, #2497). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in docs/archive/codex/assignments/POOL.md, src/simulation/constitutional-process.ts (code or data, left for the author); resolve and push. Finish it on the existing branch session46/b18-3-ballot-measures, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/elections-ballot-referrals.md and the files that pull request #2497 changes on session46/b18-3-ballot-measures

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #2497 (branch session46/b18-3-ballot-measures): merging main conflicts in docs/archive/codex/assignments/POOL.md, src/simulation/constitutional-process.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
PR #5081 closed unmerged (2026-10-19); reopened by the pool reconcile Oct 19.
Dropped by the pool reconcile Oct 19 (audit-2026-10-19; OWNER-DECISIONS Oct 19 evening, Superseded elections items): old-engine branch.

Checked 2026-10-19: branch session46/b18-3-ballot-measures shares no history with main (git refuses to merge: unrelated histories), so "merge main into it" cannot work. A builder must start a fresh branch from main and re-apply only this PR's own changes (diff the PR against its own base, not against main).
