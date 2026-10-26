---
id: gov-public-payroll-wire
title: "Public pay comes from the treasury"
area: gov
kind: wiring
priority: 2
size: S
status: done
claimed-by:
pr: #4623
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at:
---

**What.** Public pay comes from the treasury. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in src/core2/budgets-treasury.ts (code or data, left for the author); resolve and push. Finish it on the existing branch claude/gov-public-payroll-wire, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/gov-public-payroll-wire.md and the files that pull request #4623 changes on claude/gov-public-payroll-wire

**Notes.** core.md line 211, checked Oct 15.

Sent back 2026-10-16 from PR #4623 (branch claude/gov-public-payroll-wire): merging main conflicts in src/core2/budgets-treasury.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4623 (branch claude/gov-public-payroll-wire): Sent back by the merger: merging main conflicts in src/core2/budgets-treasury.ts (code or data, left for the author); resolve and push Finish on this branch (merge main into it first), then it goes back in line; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4623 (branch claude/gov-public-payroll-wire): Morning check: this Government branch changes coreAPI in the Core-owned src/core2/state.ts to accept another treasury kind. AGENTS.md requires core changes to go through the core-area session, and no Core-area agreement is recorded in this PR or discussion. Obtain and record that agreement or have the owning session supply the API fix before merging. The former budgets-treasury merge conflict is resolved; main now merges cleanly; finish on that branch, merge main into it first.
