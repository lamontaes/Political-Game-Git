---
id: docs-stale-2026-10-23-leftovers
title: "Finish the Oct 23 doc audit: 65 docs still flagged by the freshness check"
area: docs
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: "owner, Oct 23: stop the stale docs; the Oct 23 documentation audit"
---

**What.** The Oct 23 audit fixed, archived or stamped every doc it could check line by line; `node scripts/docs/freshness.mjs` still flags 65 docs, listed here. `docs/packages/` (42 files: the M1 to M7 packages, `PW-*`, `MEMORY-FLAT.md`, `DATA-FIX.md`, `homelessness.md`, `office-play.md`, `trace-all-places.md` and the README) names ended sessions, builders and branches; archive them with `release-repo-archive-docs`, keeping `M6-screens.md` and `M7-early-access.md` only if their checklists are not already pool items, and move `docs/README.md`'s row with them. `docs/design/`: `core2-porting-plan.md` and its `audit/` folder (snapshots of the old engines at one commit), `old-core-retirement-map.md` (256 retired paths) and `list-pick-inventory.md` (37) are maps of work since done; regenerate each against main or archive it, and fix `docs/README.md` and `AGENTS.md` (which cites the porting plan) to match. `electorate-one-model.md` (an Oct 14 ruling) and `story-director.md` name deleted files: update the paths, keep the ruling. `director-on-core2.md` and the two `p12-spot-checks-*` need a check and a header. The three undated `docs/reports/spine1-*` source notes get their date in the file name. The generators of `docs/grading/coverage.md` and `docs/reports/law-wiring-table.md` should write a `Current as of` line, so those two can leave the record list in `scripts/docs/freshness.json`. Code comments that cite archived paths (for example `scripts/dialogue-batch/grading-bench.ts` cites the Oct 15 Words order) point at `docs/archive/2026-10-23/`.

**Rules.** Replace, never layer: a stale line is rewritten in place, and a duplicate or ended doc is moved to `docs/archive/<date>/` with its original deleted in the same commit, never left beside the live one. Look before you ask: when a doc and `docs/coordination/OWNER-DECISIONS.md` disagree, the newest ruling wins and is quoted in the PR body.

**Done when.** `node scripts/docs/freshness.mjs` exits 0 on main, pasted in the PR body; the test suite `npm run test:skill-ops` passes; `grep -rn "docs/work-orders\|docs/coordination/SESSION\|docs/roadmap/PROGRESS" src scripts tests .github` returns nothing; every archived file is under `docs/archive/` with its original gone.

**Files.** docs/packages/, docs/design/, docs/reports/spine1-acs-county-money-sources.md, docs/README.md, AGENTS.md, scripts/docs/freshness.json, scripts/dialogue-batch/grading-bench.ts

**Notes.** Added Oct 23 by the documentation audit. Run `node scripts/docs/freshness.mjs` for the current list; it is the source of truth over this note.
