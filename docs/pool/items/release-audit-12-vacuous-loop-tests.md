---
id: release-audit-12-vacuous-loop-tests
title: "Assert rows exist before looping in the flow and row tests (#5016, #5033, #5008, #5020)"
area: release
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Add an assertion that the flows or rows exist before each loop that passes when there are none.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The fix is merged, the audit report line for it is marked fixed with the PR number, and the changed test fails when the subject it needs is absent, shown by a test run with a drawn place and seed.

**Files.** tests touched by #5016, #5033, #5008 and #5020

**Notes.** Item 12 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
