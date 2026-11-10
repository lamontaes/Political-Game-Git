---
id: docs-stale-2026-10-23-audit
title: "Oct 23 doc audit: archive 49 dead docs, fix 13, stamp 46, add the freshness check"
area: docs
kind: cleanup
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr: #5844
after:
blocked-on: docs-stale-2026-10-23-audit-part-1-archive-ended-files, docs-stale-2026-10-23-audit-part-2-repair-pointers, docs-stale-2026-10-23-audit-part-3-freshness-check
lead: cto
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
claimed-at:
---

**What.** On Oct 23 the owner said to stop the stale docs. The live tree still carries ended per-session status files in docs/coordination (BOARD.md, SESSION-A.md, SESSION-B.md, SESSION-C.md, SESSION-D.md, HANDOFF-2026-10-12.md, OPUS-CORE.md, OPUS-GOV.md, OPUS-PEOPLE.md, OPUS-PLAY.md and others), work orders, M0 packages, a long PROGRESS file and old-engine reports, and nothing checks a doc's freshness. The first attempt (PR #5844) archived 49 files under docs/archive/2026-10-23/ but was sent back and never merged. This item redoes it in three parts: archive the ended files with their originals deleted, repair every live pointer, and optionally add a freshness check.

**Cause.** Found in code: `BOARD.md` (`docs/coordination/BOARD.md`), `docs/coordination/SESSION-A.md`, `docs/coordination/HANDOFF-2026-10-12.md` and `docs/coordination/OPUS-CORE.md` still exist in the live tree, while `docs/archive/2026-10-23/`, `scripts/docs/freshness.mjs` and the doc-freshness skill do not exist (the first PR was sent back for an ENOBUFS truncation in freshness.mjs, per the Notes).

**Fix.** Move the ended docs to docs/archive/ with originals deleted and live pointers repaired. Skip the freshness script unless a cheaper stamp check is wanted. The three parts are listed in Waits on.

**Time box.** 2 hours for one Sonnet session for the closing check after the parts; each part carries its own time box.

**Rules.** Replace, never layer: every archived doc is a move with its original deleted in the same commit and every pointer to it repaired, never a copy left beside the live one. Look before you ask: a doc that disagrees with OWNER-DECISIONS.md is rewritten to the ruling, not asked about again.

**Done when.** A second session lists docs/coordination in a drawn place's checkout of main and finds the ended session, handoff and work-order files gone from it and present under docs/archive/. A search of the live tree outside docs/archive for the old paths finds nothing but permalinks, `npm run pool -- --check` shows the index current, and `npm run test:skill-ops` passes. **On screen.** None by design: this is a cleanup; the player notices nothing.

**Waits on.** Its three parts: docs-stale-2026-10-23-audit-part-1-archive-ended-files, docs-stale-2026-10-23-audit-part-2-repair-pointers, docs-stale-2026-10-23-audit-part-3-freshness-check.

**Files.** docs/coordination, docs/packages, docs/roadmap, docs/reports, docs/archive, AGENTS.md

**Notes.** Sent back 2026-10-23 from PR #5844 (branch cto/docs-fresh-2026-10-23): freshness.mjs:21-24 silently truncates the git file inventory at spawnSync default maxBuffer (ENOBUFS), falsely flags existing tests and invalidates the 64-doc receipt; handle subprocess errors and complete inventory, and correct the literal old-path exclusions; finish on that branch, merge main into it first.
