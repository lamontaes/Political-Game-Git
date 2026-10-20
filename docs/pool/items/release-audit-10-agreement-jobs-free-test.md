---
id: release-audit-10-agreement-jobs-free-test
title: "Fix agreement-jobs-free.test.ts braces and reproduce the Invalid relocation crash (#5129)"
area: world
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Fix the braces in jobIdsNamed so it recurses, assert named jobs exist, build with twoLevel true, and reproduce the Invalid relocation crash the body reported.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The fix is merged, the audit report line for it is marked fixed with the PR number, and the changed test fails when the subject it needs is absent, shown by a test run with a drawn place and seed.

**Files.** src/core2/agreement-jobs-free.test.ts

**Notes.** Item 10 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
