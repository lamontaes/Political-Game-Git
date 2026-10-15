---
id: release-merge-ready-4354
title: "Merge #4354 (unit suite): resolve the finance-day-order conflict by taking main's deletion"
area: release
kind: cleanup
priority: 1
status: open
claimed-by:
pr: #4354
blocked-on:
milestone:
source: 'reissue "Ready to merge"; PR #4354 branch pool/unit-suite'
claimed-at:
---

**What.** Main deleted src/core2/finance-day-order.test.ts; the PR now conflicts there. Resolve by taking main's deletion, then the CTO merges.

**Rules.** Plain merge of main, never force.

**Done when.** Conflict resolved, the PR merges.

**Files.** src/core2/finance-day-order.test.ts

**Notes.** Not a draft.
Sent back 2026-10-15 from PR #4354 (branch pool/unit-suite): code conflict with main in src/core2/finance-day-order.test.ts, stopgaps.json; finish on that branch, merge main into it first.
