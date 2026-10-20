---
id: release-audit-14-opening-wages-before-capital
title: "Measure the opening wage and hour rewrite against opening capital, credit and reserve (#5027)"
area: world
kind: bug
priority: 3
size: M
status: in-pr
claimed-by: claude/audit-14
pr: #5516
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:46:46.000Z
---

**What.** Run a before and after on opening capital, credit and treasury reserve in three or four drawn places for the wage and hour rewrite of up to 20 percent made before opening capital is set.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The PR body gives before and after opening capital, credit and treasury reserve in three drawn places with seeds, and the release note matches what changed.

**Files.** src/core2, docs/release/changes

**Notes.** Item 14 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
