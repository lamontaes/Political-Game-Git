---
id: core-delete-old-engine
title: "Delete the old engine folders once nothing imports them"
area: core
kind: cleanup
priority: 2
size: M
status: in-pr
claimed-by: claude/delete-old-engine
pr: #5078
blocked-on:
source: "core-needs-fixer-51 triage, Oct 15"
claimed-at: 2026-10-19T18:22:21.979Z
---

**What.** `src/simulation` (507 files) and `src/presentation` still hold about 940 files, down from about 1,600. Non-test code outside them that still imports them: 14 files in `src/core2` (item core-old-imports-14), `src/bench/world.ts`, `src/bench/creator.ts`, `src/education/tuition-prices.ts` and about 31 scripts. Move what is still used into core2 or rules, delete the rest, and keep `scripts/core2-guard` reachability green.

**Rules.** Replace, never layer: the old code, styles, data and markers are deleted in the same change, and the PR body counts what was removed.

**Done when.** The reachability script lists no live importer of src/simulation or src/presentation, the folders' unused files are deleted with the count in the PR body, and the release build, typecheck and the golden-path test pass on a drawn-place world in buildBenchWorld.

**Files.** src/simulation/**, src/presentation/**, src/bench/world.ts, src/bench/creator.ts, src/education/tuition-prices.ts, scripts/**

**Notes.** core-needs-fixer-51 triage, Oct 15. Do after core-old-imports-14.
