---
id: gov-outside-revenue-fees-wiring
title: "Fees and charges are paid on the day of use by the households and businesses that use the service, by service"
area: gov
kind: wiring
priority: 1
size: M
status: done
claimed-by:
pr: #4629
blocked-on:
after: gov-outside-revenue-fees-data
source: added with npm run pool -- add
claimed-at:
---

**What.** Fees and charges are paid on the day of use by the households and businesses that use the service, by service. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in src/core2/modules/budgets.ts (code or data, left for the author); resolve and push. Finish it on the existing branch claude/gov-outside-revenue-fees-wiring, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/gov-outside-revenue-fees-wiring.md and the files that pull request #4629 changes on claude/gov-outside-revenue-fees-wiring

**Notes.** Waits on gov-outside-revenue-fees-data (PR #4482).

Sent back 2026-10-16 from PR #4629 (branch claude/gov-outside-revenue-fees-wiring): merging main conflicts in src/core2/modules/budgets.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4629 (branch claude/gov-outside-revenue-fees-wiring): Morning check: this Government branch introduces src/core2/living-cost-split.ts and changes settlement in the Core-owned src/core2/modules/residents.ts. No Core-area agreement is recorded in the PR body or discussion. Obtain and record the owning area’s agreement or have the Core session provide the settlement hook before merging. The previous budgets conflict is resolved and main now merges cleanly; finish on that branch, merge main into it first.
