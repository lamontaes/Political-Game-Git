---
id: release-audit-04-close-5019-stopgap-line
title: "Close #5019 as superseded and fix the SG-WORLD-department-government line number (#4984)"
area: release
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/peaceful-ritchie-03780x
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:20:56.076Z
---

**What.** Close #5019 as superseded by #5044 and correct the line number the stopgap row SG-WORLD-department-government names; check the marker is at that line with a test run of the stopgap tripwire.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The fix is merged, the audit report line for it is marked fixed with the PR number, and the changed test fails when the subject it needs is absent, shown by a test run with a drawn place and seed.

**Files.** src/core2/data/stopgaps.json

**Notes.** Item 4 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
