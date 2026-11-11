---
id: carcass-audit-everything-not-engine-view-or-guard
title: "Carcass audit: every file that is neither an engine, a view nor a guard is listed for deletion with the proof nothing reads it"
area: core
kind: research
priority: 1
size: M
status: in-pr
claimed-by: claude/pool-carcass-audit-everything-not-engine-view-or-guard
pr: #8232
after:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-10T22:29:08.622Z
lead: cto
standard: 2
model: haiku
effort: medium
root: none
checked: fable 2026-11-10
branch: claude/pool-carcass-audit-everything-not-engine-view-or-guard
---

**What.** Read-only. The owner (Oct 28): once the trim is done we should be left with the carcass of the game; if bloat, test files, unused scripts, research or data sit there, get it out the same way. The old-core half is moot (src/simulation was deleted in #6659). What is left is to list, with the proof nothing reads each: the scripts under scripts/ that nothing in package.json, .github, docs or other scripts references (a first count found 65 of 384, some of them tests a runner may glob); tests whose subject was deleted; data files under data/ and src/core2/data that no engine, guard or script reads (data is 1.1 GB); and docs/reports and docs/research files that no engine, guard, skill or report reads (290 MB and 657 files). Output: docs/reports/carcass-2026-10-28.md with one row per file (path, size, who would read it, proof none does) and a per-kind guard proposal (extend research-data-has-reader to data and scripts). The list is handed to the trim session by a Needs line in the channel and a PR comment on the trim's newest PR; the trim deletes.

**Cause.** Design: owner ruling Oct 28, 2026 (docs/coordination/OWNER-DECISIONS.md, the Oct 28 order: "the carcass audit in parallel"): once the trim is done, what is left should be the carcass of the game, and bloat, test files, unused scripts, research or data get out the same way. The report file was never written.

**Fix.** Read-only. List the scripts, tests, data files, docs/reports files and docs/research files that nothing in package.json, .github, docs, skills or the engines reads, with the proof for each, in a report the slim-down session deletes from. Propose extending the research-data-has-reader guard to data and scripts.

**Time box.** 3 hours for a Haiku session.

**Rules.** Read-only: no deletions, no pool status changes, no messages. Look before you ask: the duplicates report, the engine map and dead-code-2026-10-14-keeps.txt already cover parts; cite them, do not redo them. Replace, never layer applies to the deletions the trim makes from this list: the files go, they are not left beside anything.

**Done when.** A second session picks ten rows drawn at random from docs/reports/carcass-2026-10-28.md, searches package.json, .github, docs, the skills and the engines for each file, and finds no reader for any of them. The report has counts at the top by kind (files, MB) and a row per file with its proof. The guard proposal names the guard id (research-data-has-reader), its test (tests/guards/research-data-has-reader.test.ts) and the baseline file, and the trim's Needs line points at the report.

**Waits on.** Nothing.

**Files.** docs/reports/carcass-2026-10-28.md (new), scripts/, tests/guards/research-data-has-reader.test.ts, docs/research/, docs/reports/

**Notes.** Filed by the CTO on the owner's go (Oct 28). engine: none (audit). guard: research-data-has-reader (to extend). Read: the duplicates report, the engine map, the retroactive audit, dead-code keeps. Starts now.

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `claude/carcass-audit` is kept; claiming this item takes it over.

Claimed by next for pool-check (2026-11-10 21:01 UTC) on branch claude/pool-carcass-audit-everything-not-engine-view-or-guard.

Released (2026-11-10): acceptance check of the pool command; nothing was built. Continue on branch claude/pool-carcass-audit-everything-not-engine-view-or-guard and pull request #8232.

Claimed by next for haiku-a69d (Claude Haiku 5.5 in the Claude Code cloud CLI, tier light) (2026-11-10 22:26 UTC) on branch claude/pool-carcass-audit-everything-not-engine-view-or-guard.
