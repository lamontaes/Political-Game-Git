---
id: release-spelling-label-stopgaps
title: "american-english-sweep fails on main: a stopgap text used the British double-l spelling of label"
area: release
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/spelling-label
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T14:47:48.311Z
---

**What.** The stopgap text was already corrected on main; the sweep also flagged this item's own title and a British spelling of license in `gov-official-salary-research`. Both reworded.

**Rules.** American English everywhere.

**Done when.** `npm run spelling` flags nothing.

**Files.** docs/pool/items/release-spelling-label-stopgaps.md, docs/pool/items/gov-official-salary-research.md

**Notes.** Found in the Oct 16 session.

Sent back 2026-10-16 from PR #4645 (branch claude/spelling-labeled): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
