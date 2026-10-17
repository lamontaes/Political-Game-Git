---
id: core-delete-old-engine
title: "Delete the old engine folders once nothing imports them"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "core-needs-fixer-51 triage, Oct 15"
---

**What.** `src/simulation` (507 files) and `src/presentation` still hold about 940 files, down from about 1,600. Non-test code outside them that still imports them: 14 files in `src/core2` (item core-old-imports-14), `src/bench/world.ts`, `src/bench/creator.ts`, `src/education/tuition-prices.ts` and about 31 scripts. Move what is still used into core2 or rules, delete the rest, and keep `scripts/core2-guard` reachability green.

**Rules.** Replace, never layer: the old code, styles, data and markers are deleted in the same change, and the PR body counts what was removed.

**Done when.** The reachability script lists no live importer of src/simulation or src/presentation, the folders' unused files are deleted with the count in the PR body, and the release build, typecheck and the golden-path test pass on a drawn-place world in buildBenchWorld.

**Files.** src/simulation/**, src/presentation/**, src/bench/world.ts, src/bench/creator.ts, src/education/tuition-prices.ts, scripts/**

**Notes.** core-needs-fixer-51 triage, Oct 15. Do after core-old-imports-14.

Measured Oct 17 (claude), with `scripts/dead-code/reachable.mjs` run twice on main. From the game's own entry points (bench, core2, director, release, rules, the golden-path suite), 902 of the 939 files in `src/simulation` and `src/presentation` are still reachable, 53 are not. Run again with every other folder as an entry (all of `src/**` outside the two, `scripts`, `tests`, `tooling`, `desktop`), only one old file is unreachable, `src/simulation/crisis/death-causes.test.ts`, a test nothing imports. So the 53 files unreachable from the game are all imported by scripts or tests, and there is no pile of dead files to delete first. The deletion is a port-or-delete of the scripts and tests that import the old engine (about 31 scripts and the tests in `src/simulation`, `src/presentation` and `tests/`), then the folders go in one change. Count the importers with the second entry set before starting: the reachability tool, edited to take those entries, is the check.
