---
id: release-repo-delete-stale-docs
title: "Delete the audit's ~1,980 stale doc files, after folding any ruling they hold into OWNER-DECISIONS"
area: docs
kind: cleanup
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** The owner ruled on Oct 24 that stale docs are deleted, not archived; Git history keeps them. The October 19 audit lists about 1,980 files (270 MB) as archive candidates in `docs/reports/repo-audit-2026-10-19.md`, section G3: `docs/packages/`, the old `docs/work-orders/` files (never the Oct 24 orders), the ended-session files in `docs/coordination/`, `docs/decisions/`, `docs/plans/`, `docs/integration/`, `docs/handoff/`, `docs/findings/`, `docs/connectivity/`, `docs/playtest/`, `docs/audits/` with `ARCHITECTURE-INTEGRITY-AUDIT.md`, `docs/ui/` and `docs/mockups/`, `docs/roadmap/PROGRESS.md` and `later-specs-draft.md`, `docs/codex/`, and whatever the Oct 23 freshness work moved under `docs/archive/2026-10-23/`. Before deleting, fold any text that holds a ruling into `docs/coordination/OWNER-DECISIONS.md`, and move the three files code reads out of `docs/codex/` first. Recheck every path against main at the time; the snapshot is old.

**Rules.** Replace, never layer: the three files code reads are moved with their readers in the same change, and nothing is copied beside the old. Look before you ask: every file with a ruling in it (DECISION-REGISTER, prior-rulings, DECISION-LOG, model-log, handoffs) is read and its rulings folded into OWNER-DECISIONS before it goes. The pool is the only backlog and OWNER-DECISIONS the only rulings log.

**Done when.** Every path on the G3 list is gone from main (the PR body counts files and MB removed); `grep -rn "docs/codex\|docs/packages\|docs/plans" src/ scripts/ tests/ .github/ AGENTS.md .agents` returns nothing; `node scripts/docs/freshness.mjs --report` flags fewer than 10 docs; `tests/assumption-markers.test.ts`, the golden-path suite and the release check pass; a screenshot of the bench in a drawn place shows the kit12 styles still applied.

**Files.** docs/reports/repo-audit-2026-10-19.md, docs/coordination/OWNER-DECISIONS.md, src/bench/dev-api.ts, scripts/audit/autoscan.ts, tests/assumption-markers.test.ts

**Notes.** Replaces `release-repo-archive-docs` (owner ruled delete, Oct 24; that item is dropped and its Notes keep the old scope). The freshness script comes with the Oct 23 doc-freshness PR (#5844); if it is not on main when this starts, do `release-repo-sweep-unread-files` first. Order: `docs/work-orders/repo-delete-2026-10-24.md`. A PR names this item on line 1 and `Lead: delete` in its body.
