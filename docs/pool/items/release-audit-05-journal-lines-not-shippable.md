---
id: release-audit-05-journal-lines-not-shippable
title: "Set the nine hand-written journal lines not shippable and require the partners-met and parent-job lines (#5226)"
area: release
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/audit-05-journal-lines
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:24:59.612Z
---

**What.** Set the nine lines marked origin authored and shippable true to not shippable until graded, and make the test require the partners-met and parent-job lines.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The fix is merged, the audit report line for it is marked fixed with the PR number, and the changed test fails when the subject it needs is absent, shown by a test run with a drawn place and seed.

**Files.** src/core2, tests

**Notes.** Item 5 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
