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

**What.** The October 20 merge audit read the diffs of 55 PRs merged overnight by the four merger lanes. It found three PRs merged after their own send-back with no new commit, one merged into another PR's branch instead of main, old-engine imports and hand-written journal lines on main, and weak tests and misstated release notes. Work the numbered list in the report, one fix per PR, with the bad ones first.

**Rules.** An effect is a read: every fixed test must assert the feature through the records an engine wrote and fail when nothing is found, never return early. AGENTS.md rules; text only from the English engine; no imports from src/simulation in src/core2; no owner or date notes in code or data.

**Done when.** Every numbered fix in docs/reports/merge-audit-2026-10-20.md is made in its own PR or carries a written reason, each fixed test fails on the old code and passes in a drawn place, and the report's list is updated with the PR for each fix.

**Files.** docs/reports/merge-audit-2026-10-20.md

**Notes.** Split by number so several builders can take one each.
