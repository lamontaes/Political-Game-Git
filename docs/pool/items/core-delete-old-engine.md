---
id: core-delete-old-engine
title: "Delete the old engine: lift what the game still uses into core2, then remove src/simulation and src/presentation"
area: core
kind: cleanup
priority: 1
size: L
status: blocked
claimed-by:
pr:
after:
blocked-on: core-old-engine-01-zero-dice-guard-repoint, core-old-engine-02-gov-rules-duplicates, core-old-engine-03-schedules-jobs-traits-history, core-old-engine-04-opening-population-no-throwaway-world, core-old-engine-05-health-onset-lift, core-old-engine-06-place-lookup-and-scripts, core-old-engine-07-appearance-and-delete
source: "owner ruling, Oct 19; docs/reports/repo-audit-2026-10-19.md section A and G2"
---

**What.** The owner ruled on Oct 19 that the old core goes: useful code is lifted into core2 and nothing is kept around. The audit (`docs/reports/repo-audit-2026-10-19.md`, section A) measured `src/simulation/` at 924 files, 27 MB and about 390,000 lines, imported by 34 files outside the folder through 111 import edges, and it is not a leaf: one import drags in 857 of the 924 files, so deletion is all-or-nothing per importer. Its sibling `src/presentation/` (the old appearance engine, 15 files) goes with it. The lift is seven ordered steps, each its own sub-item in this pool: re-point the zero-dice guard first, switch to the core2 copies of the 18 duplicated gov-rules files, lift schedules, jobs, traits and character history, make the opening population write straight into core2, lift the health onset code, re-home the place-lookup builder and the eight exporter scripts, then move the appearance engine out and delete both folders. This item is the parent; it is done when its seven parts are done.

**Rules.** Replace, never layer: every lifted file deletes its original in the same PR, and the PR body counts the files removed. The new core is the engine: no new code in `src/simulation`, and no new import of it anywhere. No dice: lifted code keeps its reads from the record, never a draw. Wire to the world: a lifted piece is proven by the same town, by record id, in a drawn place before and after.

**Done when.** `src/simulation/` and `src/presentation/` do not exist on main; `grep -r "simulation/" src/ scripts/ tests/` returns nothing; the zero-dice guard scans `src/core2`, `src/bench` and `src/director` and reports; the golden-path suite and the speed guard pass on a drawn place built by `buildBenchWorld`; and the PR bodies of the seven sub-items each count the files removed.

**Files.** src/simulation/, src/presentation/, src/core2/population.ts, src/core2/town-households.ts, src/bench/creator.ts, scripts/zero-dice-guard.mjs, eslint.config.js, tsconfig.node.json

**Notes.** Rewritten Oct 19 by the acting CTO from the repository audit (PR #5125): the earlier text said 507 files; the tree has 924. The audit's step table (G2, steps 1–11) is folded into the seven sub-items named in `blocked-on`. Open drafts #5031, #5032, #5073, #5084, #5093, #5097, #5100, #5104, #5108, #5110 carry pieces; finish on those branches rather than starting over. PR #5078 (the old-imports guard) stays its own PR.
