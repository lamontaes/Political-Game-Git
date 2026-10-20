---
id: release-merge-audit-oct20-fixes
title: "Fix what the Oct 20 merge audit found in 55 merged PRs"
area: release
kind: bug
priority: 2
size: L
status: blocked
claimed-by: claude/merge-audit-fixes
pr:
blocked-on: release-audit-01-news-office-proof-tests
source: "docs/reports/merge-audit-2026-10-20.md"
claimed-at: 2026-10-20T04:18:13.609Z
---

**What.** The October 20 merge audit read the diffs of 55 PRs merged overnight and found three merged after their own send-back, one merged into the wrong branch, old-engine imports and hand-written journal lines on main, and weak tests and misstated release notes. Work the numbered list in the report, one fix per PR, bad ones first.

**Rules.** AGENTS.md rules; text only from the English engine; no imports from src/simulation in src/core2; no owner or date notes in code or data; tests assert the feature and fail when nothing is found.

**Done when.** Every numbered fix in the report is made or carries a written reason, and the report's list is updated.

**Files.** docs/reports/merge-audit-2026-10-20.md

**Notes.** Split by number so several builders can take one each.
