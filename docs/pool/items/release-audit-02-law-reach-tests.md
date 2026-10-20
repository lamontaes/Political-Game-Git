---
id: release-audit-02-law-reach-tests
title: "Make law-reach-group-a/b tests redraw until a legislator or private school exists (#4976)"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Redraw until a town has a legislator or a private school and run the filing, reach and closure assertions; correct the pool note that claims every site is fixed.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The fix is merged, the audit report line for it is marked fixed with the PR number, and the changed test fails when the subject it needs is absent, shown by a test run with a drawn place and seed.

**Files.** src/core2/law-reach-group-a.test.ts, src/core2/law-reach-group-b.test.ts

**Notes.** Item 2 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
