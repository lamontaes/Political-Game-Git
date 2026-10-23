---
id: docs-stale-2026-10-23-audit
title: "Oct 23 doc audit: archive 49 dead docs, fix 13, stamp 46, add the freshness check"
area: docs
kind: cleanup
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On Oct 23 the owner said to stop the stale docs. The live tree still carried 28 ended per-session status files, the BOARD, two handoffs, six work orders, the seven M0 packages, the 4,243-line PROGRESS file, a duplicate specs draft and five old-engine reports, and nothing checked a doc's freshness. This slice archives those 49 files under docs/archive/2026-10-23/ with their originals deleted, rewrites 13 docs whose rules were overruled, stamps 46 checked docs with a Current as of line, repairs every live pointer to a moved path, and adds scripts/docs/freshness.mjs with its skill and npm script so release:check prints the freshness table.

**Rules.** Replace, never layer: every archived doc is a move with its original deleted in the same commit and every pointer to it repaired, never a copy left beside the live one. Look before you ask: a doc that disagrees with OWNER-DECISIONS.md is rewritten to the ruling, not asked about again.

**Done when.** Every one of the 49 archived paths is under docs/archive/2026-10-23/ and gone from its old place; grep of the live tree outside docs/archive for the 49 old paths returns nothing but a commit-pinned GitHub permalink and two JSON data strings; node scripts/docs/freshness.mjs --report exits 0 and lists 64 flagged docs, all in docs-stale-2026-10-23-leftovers; the test suite npm run test:skill-ops passes with the .claude/skills mirrors byte-identical to .agents/skills; npm run pool -- --check shows the index current; prettier is clean on every changed Markdown and JSON file.

**Files.** docs/archive/2026-10-23/, docs/coordination/, docs/packages/, docs/roadmap/, docs/reports/, scripts/docs/freshness.mjs, scripts/docs/freshness.json, .agents/skills/doc-freshness/SKILL.md, .claude/skills/doc-freshness/SKILL.md, AGENTS.md, package.json

**Notes.** Sent back 2026-10-23 from PR #5844 (branch cto/docs-fresh-2026-10-23): freshness.mjs:21-24 silently truncates the git file inventory at spawnSync default maxBuffer (ENOBUFS), falsely flags existing tests and invalidates the 64-doc receipt; handle subprocess errors and complete inventory, and correct the literal old-path exclusions; finish on that branch, merge main into it first.
