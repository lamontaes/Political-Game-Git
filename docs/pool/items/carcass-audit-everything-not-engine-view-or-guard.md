---
id: carcass-audit-everything-not-engine-view-or-guard
title: "Carcass audit: every file that is neither an engine, a view nor a guard is listed for deletion with the proof nothing reads it"
area: core
kind: research
priority: 1
size: M
status: claimed
claimed-by: claude/carcass-audit
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T05:25:01.766Z
---

**What.** Read-only. The owner (Oct 28): once the trim is done we should be left with the carcass of the game; if bloat, test files, unused scripts, research or data sit there, get it out the same way. List, with the proof nothing reads each: the 13 files outside src/simulation that still import it and src/simulation itself once they are gone; the scripts under scripts/ nothing in package.json, .github, docs or other scripts references (a first count found 65 of 384, some of them tests a runner may glob); tests whose subject was deleted; data files under data/ and src/core2/data no engine, guard or script reads (data is 1.1 GB); docs/reports and docs/research files no engine, guard, skill or report reads (290 MB and 657 files). Output: docs/reports/carcass-2026-10-28.md with one row per file (path, size, who would read it, proof none does) and a per-kind guard proposal (extend research-data-has-reader to data and scripts). Time box: 3 hours. The list is handed to the trim session by a Needs line in the channel and a PR comment on the trim's newest PR; the trim deletes.

**Rules.** Read-only: no deletions, no pool status changes, no messages. Look-first: the duplicates report, the engine map, dead-code-2026-10-14-keeps.txt already cover parts; cite, do not redo. Replace never layer applies to the deletions the trim makes from this list.

**Done when.** docs/reports/carcass-2026-10-28.md on main with counts at the top by kind (files, MB) and a row per file with its proof; the guard proposal names the guard id and the baseline file; the trim's Needs line points at it.

**Files.** docs/reports/carcass-2026-10-28.md,src/simulation,scripts,tests,data,docs/research,docs/reports

**Notes.** Filed by the CTO on the owner's go (Oct 28). engine: none (audit). guard: research-data-has-reader (to extend). Read: the duplicates report, the engine map, the retroactive audit, dead-code keeps. Starts now.
