---
id: release-merge-ready-4354
title: "Merge #4354 (unit suite): resolve the finance-day-order conflict by taking main's deletion"
area: release
kind: cleanup
priority: 1
status: in-pr
claimed-by: pool/unit-suite
pr: #4354
blocked-on:
milestone:
source: 'reissue "Ready to merge"; PR #4354 branch pool/unit-suite'
claimed-at: 2026-10-15T21:25:05.293Z
---

**What.** Main deleted src/core2/finance-day-order.test.ts; the PR now conflicts there. Resolve by taking main's deletion, then the CTO merges.

**Rules.** Plain merge of main, never force.

**Done when.** Conflict resolved, the PR merges.

**Files.** src/core2/finance-day-order.test.ts

**Notes.** Not a draft.
