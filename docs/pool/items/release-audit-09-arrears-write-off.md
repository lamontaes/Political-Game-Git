---
id: release-audit-09-arrears-write-off
title: "Bound jobless households' living-cost arrears with a write-off and test it (#4939)"
area: world
kind: bug
priority: 3
size: M
status: in-pr
claimed-by: claude/audit-09-arrears
pr: #5524
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:37:54.521Z
---

**What.** Add a bound or write-off for arrears that retry daily and grow forever for jobless households, add a test for it, measure a dense-town year, and close #4937 as a duplicate.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** A test in a drawn place and seed shows a jobless household's arrears stop growing at the bound, a dense-town year runs within 20 percent of base with the measurement in the PR body, and #4937 is closed.

**Files.** src/core2/modules/living-costs.ts

**Notes.** Item 9 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
