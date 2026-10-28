---
id: core-old-engine-07-appearance-and-delete
title: "The appearance engine moves to src/appearance/, then src/simulation and src/presentation are deleted"
area: core
kind: cleanup
priority: 1
size: M
status: in-pr
claimed-by: claude/old-engine-appearance
pr: #6659
after:
blocked-on:
source: "docs/reports/repo-audit-2026-10-19.md section A, B1 and G2 steps 9 and 11; acting CTO ruling, Oct 19"
claimed-at: 2026-10-28T16:42:59.900Z
---

**What.** This item records the October19 audit snapshot at `0104686`; its paths and counts require a current check before implementation. `src/presentation/` (15 files, 0.3 MB) is the old appearance engine, used by `src/bench/appearance.ts`, `src/bench/creator.ts`, `src/authoring` and 22 `scripts/art-asset-factory` files, with `character-components.ts` importing `person-appearance` from the old core. The acting CTO ruled on Oct 19 that it is presentation, not simulation: it moves to its own small folder `src/appearance/`, outside the engine, with the one old-core import replaced by a core2 read. Then the last step of the audit's table: delete `src/simulation/` (924 files), `src/presentation/`, `src/education/tuition-prices.ts` and `src/fiscal-authority/` (imported only by the old core), `data/law-consequences/election-state-landings.json`, the 31 old-core tests (19 inside the folder, the 11 importers, `tests/simulation-loads-under-tsx.test.ts`), the 18 old gov-rules copies not already removed in step 2, and the old-core entries in `eslint.config.js` (3 rules) and `tsconfig.node.json`. About 980 files and 27.6 MB of code go; one engine remains.

**Rules.** Replace, never layer: `src/presentation/` is deleted in the same PR that adds `src/appearance/`, and the deletion PR body counts every file removed. The new core is the engine: after this PR no file anywhere imports `src/simulation`, and nothing is kept "just in case" (owner, Oct 19). Slim the repository like a real game: the guards stay. Recheck the present import graph and existing pool claims before removing or moving any path; preserve current consumers, guards and provenance.

**Done when.** `src/simulation/` and `src/presentation/` do not exist on main; `grep -r "simulation/" src/ scripts/ tests/` and `grep -r "src/presentation" src/ scripts/ tests/ eslint.config.js tsconfig*.json` return nothing; `npm run old-imports -- --fail` exits 0; `npm run build`, typecheck, the zero-dice guard, the golden-path suite and the speed guard pass; the creator screen draws a person's figure from `src/appearance/` in a full-window screenshot of a drawn place.

**Files.** src/presentation/, src/appearance/, src/bench/appearance.ts, src/bench/creator.ts, src/authoring/, scripts/art-asset-factory/, src/simulation/, src/education/tuition-prices.ts, src/fiscal-authority/, data/law-consequences/election-state-landings.json, tests/simulation-loads-under-tsx.test.ts, eslint.config.js, tsconfig.node.json

**Notes.** The audit (G2 step 9) left the appearance engine's home as an owner pick between `src/bench/appearance/` and `scripts/art-asset-factory/engine/`; the acting CTO ruled `src/appearance/` on Oct 19 so both the bench and the art scripts read one folder. `tests/guards/research-data-has-reader.test.ts` counts `src/simulation` as a reader of 121 research files; re-baseline its ceilings in this PR (audit section E). Parent: core-delete-old-engine.

Old engine session, Oct 28: the gate is lifted. `release-old-core-typecheck` is blocked on this item while this item waited on it, a loop; its done-when (typecheck passes with `src/simulation` removed, no tsconfig or script names it) is met by this item's deletion PR, which carries both. The appearance move lands first as its own PR (`Touches pool item`), since it shares no file with #6637, #6641 or #6642; the deletion PR follows once those three merge, with `Pool item: core-old-engine-07-appearance-and-delete` on line 1.
