---
id: release-audit-13-grade-always-wins
title: "Stop one grade making a piece always win (#5286)"
area: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Require several grades or keep variety so one grade no longer forces a piece to win, and set the release note to impact none until grades exist.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** A test shows a piece with one grade does not always win in a drawn place and seed, and the release declaration reads impact none.

**Files.** docs/release/changes, the grading module #5286 touched

**Notes.** Item 13 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
