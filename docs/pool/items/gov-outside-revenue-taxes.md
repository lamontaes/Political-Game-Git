---
id: gov-outside-revenue-taxes
title: "Taxes the town's flows do not pay (corporate, excise, vehicle, customs, estate) come from real payers"
area: gov
kind: stopgap
priority: 1
size: M
status: done
claimed-by: claude/gov-outside-revenue-taxes
pr: #4499
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T05:04:17.555Z
---

**What.** Taxes the town's flows do not pay (corporate, excise, vehicle, customs, estate) come from real payers. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in src/core2/budgets-treasury.ts (code or data, left for the author); resolve and push. Finish it on the existing branch claude/gov-outside-revenue-taxes, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/gov-outside-revenue-taxes.md and the files that pull request #4489 changes on claude/gov-outside-revenue-taxes

**Notes.** Rewritten to the quality gate 2026-10-15 (the item was a stub when added with `npm run pool -- add`).

Sent back 2026-10-16 from PR #4489 (branch claude/gov-outside-revenue-taxes): merging main conflicts in src/core2/budgets-treasury.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
