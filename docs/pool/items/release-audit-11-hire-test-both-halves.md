---
id: release-audit-11-hire-test-both-halves
title: "Make the hire test assert both halves and explain the threefold timeouts (#4928)"
area: world
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/political-game-pool-76ksvw
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:32:30.623Z
---

**What.** Assert both halves of the hire, explain or revert the threefold timeouts, and run the full residents.test.ts.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The fix is merged, the audit report line for it is marked fixed with the PR number, and the changed test fails when the subject it needs is absent, shown by a test run with a drawn place and seed.

**Files.** src/core2/modules/residents.test.ts

**Notes.** Item 11 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
