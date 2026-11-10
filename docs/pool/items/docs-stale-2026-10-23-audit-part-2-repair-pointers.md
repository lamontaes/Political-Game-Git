---
id: docs-stale-2026-10-23-audit-part-2-repair-pointers
title: "Repair every pointer to an archived doc"
area: docs
kind: cleanup
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: docs-stale-2026-10-23-audit-part-1-archive-ended-files
blocked-on:
lead: cto
model: sonnet
effort: low
root: none
source: split from docs-stale-2026-10-23-audit in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** After part 1 moves the ended files, pointers in AGENTS.md, skills, rules and other docs still name the old paths. A reader following one hits a missing file. This part finds every pointer and repairs it, and leaves nothing that names an old path except a commit-pinned permalink. Guards: the pointers to archived docs, so no session follows one to a missing file (owner, Oct 23).

**Cause.** Design: the owner on Oct 23 ("stop the stale docs"), recorded in docs/coordination/OWNER-DECISIONS.md; the moved paths are listed by part 1.

**Fix.** Search the live tree outside docs/archive for every old path part 1 moved and repair each pointer to the archive path or to the live doc that replaced it. Keep `.agents/skills` and `.claude/skills` mirrors byte for byte if one is touched.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Replace, never layer: a pointer is repaired, never left beside a stale one. Look before you ask: read OWNER-DECISIONS.md before changing a rule's wording.

**Done when.** A second session searches the live tree outside docs/archive in a drawn place's checkout of main for each old path and finds none except a commit-pinned permalink. `npm run test:skill-ops` passes with the mirrors byte for byte, prettier is clean on the changed Markdown, and `npm run pool -- --check` shows the index current.

**Waits on.** Part 1 (docs-stale-2026-10-23-audit-part-1-archive-ended-files).

**Files.** AGENTS.md, docs/coordination, docs/packages, docs/roadmap, docs/reports
