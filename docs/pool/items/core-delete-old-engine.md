---
id: core-delete-old-engine
title: "Delete the old engine folders once nothing imports them"
area: core
kind: cleanup
priority: 2
size: M
status: done
claimed-by: claude/old-engine-delete
pr: #6659
blocked-on:
source: "core-needs-fixer-51 triage, Oct 15"
claimed-at: 2026-10-28T17:50:29.121Z
---

**What.** `src/simulation` (507 files) and `src/presentation` still hold about 940 files, down from about 1,600. Non-test code outside them that still imports them: 14 files in `src/core2` (item core-old-imports-14), `src/bench/world.ts`, `src/bench/creator.ts`, `src/education/tuition-prices.ts` and about 31 scripts. Move what is still used into core2 or rules, delete the rest, and keep `scripts/core2-guard` reachability green.

**Rules.** Replace, never layer: the old code, styles, data and markers are deleted in the same change, and the PR body counts what was removed.

**Done when.** The reachability script lists no live importer of src/simulation or src/presentation, the folders' unused files are deleted with the count in the PR body, and the release build, typecheck and the golden-path test pass on a drawn-place world in buildBenchWorld. The audit also requires preserving the zero-dice coverage over the live engine, passing the existing speed guard, and counting files removed in each implementation PR. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/simulation/**, src/presentation/**, src/bench/world.ts, src/bench/creator.ts, src/education/tuition-prices.ts, scripts/**

**Notes.** core-needs-fixer-51 triage, Oct 15. Do after core-old-imports-14.

Measured Oct 19 (claude): `npm run old-imports` (new, `scripts/core2-guard/old-imports.mjs`) finds 939 files in the two folders, 920 reachable from files outside them and 19 unreachable. The 19 are old tests of code that is still live, so deleting them would drop coverage, not dead code; they go with the code they test. Importers outside, by folder: scripts/art-asset-factory 22, src/core2 11 (the open core-old-imports items), scripts/source 7, src/bench 4, tests 10, and one each in data/tables, src/education, src/authoring, src/districts and five scripts. The folder cannot be emptied in one change: the art pipeline alone keeps most of src/presentation (appearance-engine, garment fit, character components) alive. This item stays open for the folder-by-folder moves; `npm run old-imports -- --fail` is the done line.

Historical audit proposal from #5125 (snapshot 0104686, October19): Rewritten Oct 19 by the acting CTO from the repository audit (PR #5125): the earlier text said 507 files; the tree has 924. The audit's step table (G2, steps 1–11) is folded into the seven sub-items named in `blocked-on`. Open drafts #5031, #5032, #5073, #5084, #5093, #5097, #5100, #5104, #5108, #5110 carry pieces; finish on those branches rather than starting over. PR #5078 (the old-imports guard) stays its own PR. The later current implementation notes and existing pool claims remain authoritative; recheck this proposed breakdown against the present import graph before starting it.

Oct 22, merger A: PR #5797 moves one legacy tuition-price helper beside its four existing consumers, tracked by core-old-engine-tuition-prices-move. This parent remains open for its remaining importers, unused-file deletion and full acceptance.
