---
id: release-audit-09-arrears-write-off
title: "Bound jobless households' living-cost arrears with a write-off and test it (#4939)"
area: world
kind: bug
priority: 3
size: M
status: claimed
claimed-by: claude/fs11vb-arrears
pr: #5524
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T16:56:36.284Z
---

**What.** Add a bound or write-off for arrears that retry daily and grow forever for jobless households, add a test for it, measure a dense-town year, and close #4937 as a duplicate.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** A test in a drawn place and seed shows a jobless household's arrears stop growing at the bound, a dense-town year runs within 20 percent of base with the measurement in the PR body, and #4937 is closed.

**Files.** src/core2/modules/living-costs.ts

**Notes.** Item 9 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.

Sent back 2026-10-20 from PR #5524 (branch claude/audit-09-arrears): living-costs-arrears.test.ts fails on a random draw (Ofu, American Samoa) where no household goes unpaid, so the non-vacuous check needs a bounded redraw until a place has an unpaid household; finish on that branch, merge main into it first.
