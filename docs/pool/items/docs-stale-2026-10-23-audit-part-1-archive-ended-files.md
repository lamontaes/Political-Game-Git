---
id: docs-stale-2026-10-23-audit-part-1-archive-ended-files
title: "Archive the ended session and handoff files"
area: docs
kind: cleanup
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-docs-stale-2026-10-23-audit-part-1-archive-ended-files
pr: #8248
after:
blocked-on:
lead: cto
model: sonnet
effort: low
root: none
source: split from docs-stale-2026-10-23-audit in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-10T22:28:17.762Z
branch: claude/pool-docs-stale-2026-10-23-audit-part-1-archive-ended-files
---

**What.** The live tree still carries ended per-session status files, the BOARD, handoffs, work orders, M0 packages and old-engine reports. They mislead a session that reads them as current. This part moves each ended file to docs/archive/2026-10-23/ and deletes the original. The pointers to them are repaired in the next part.

**Cause.** Found in code: `BOARD.md` (`docs/archive/2026-10-23/coordination/BOARD.md`), `docs/archive/2026-10-23/coordination/SESSION-A.md`, `docs/archive/2026-10-23/coordination/HANDOFF-2026-10-12.md` and `docs/archive/2026-10-23/coordination/OPUS-CORE.md` are ended per-session status files still in the live tree.

**Fix.** List the ended per-session status files, the BOARD, the two handoffs, the work orders under docs/work-orders that are done, the M0 packages and the old-engine reports in docs/coordination, docs/packages and docs/reports. Move each to docs/archive/2026-10-23/ with its original deleted in the same commit. Do not touch OWNER-DECISIONS.md, CREW.md, LEADS-2026-10-24.md, MERGE-FIRST.md or DECISION-REGISTER.md.

**Time box.** 4 hours for one Sonnet session.

**Rules.** Replace, never layer: every archived doc is a move with its original deleted in the same commit, never a copy beside the live one. Look before you ask: a doc that disagrees with OWNER-DECISIONS.md is archived or rewritten to the ruling, not asked about again.

**Done when.** A second session lists docs/coordination in a drawn place's checkout of main and finds the named session, handoff and work-order files gone from it and present under docs/archive/2026-10-23/ with the same content. The PR body counts the files moved. **On screen.** None by design: this is a cleanup.

**Waits on.** Nothing.

**Files.** docs/coordination, docs/packages, docs/reports, docs/archive

**Notes.** Claimed by next for sonnet-0b74 (Sonnet in Claude Code, tier mid) (2026-11-10 21:51 UTC) on branch claude/pool-docs-stale-2026-10-23-audit-part-1-archive-ended-files.

Released (2026-11-10): Second-session check of the pool command; nothing was built. Continue on branch claude/pool-docs-stale-2026-10-23-audit-part-1-archive-ended-files.

Claimed by next for muse-8740 (Muse Spark in Muse Code, tier mid) (2026-11-10 22:27 UTC) on branch claude/pool-docs-stale-2026-10-23-audit-part-1-archive-ended-files.
