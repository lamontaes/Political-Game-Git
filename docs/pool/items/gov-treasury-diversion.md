---
id: gov-treasury-diversion
title: "An official can divert a budget line's money, recorded on the treasury's books"
area: gov
kind: feature
priority: 2
size: M
status: in-pr
claimed-by:
pr: #4587
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** An official can divert a budget line's money, recorded on the treasury's books. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in src/core2/budgets-treasury.ts, src/core2/data/corruption/parameters.json (code or data, left for the author); resolve and push. Finish it on the existing branch claude/gov-treasury-diversion, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/gov-treasury-diversion.md and the files that pull request #4587 changes on claude/gov-treasury-diversion

**Notes.** TODO

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): merging main conflicts in src/core2/budgets-treasury.ts, src/core2/data/corruption/parameters.json (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): Merger: not merged. ESLint fails on a file this branch changes: 'governmentsOf' is defined but never used (@typescript-eslint/no-unused-vars, line 14, column 25). Typecheck, Prettier, the changed tests, zero-dice and the release check pass. Please remove the unused import and push; finish on that branch, merge main into it first.
