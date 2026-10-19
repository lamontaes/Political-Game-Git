---
id: release-suite-red-list-on-main
title: "List the red tests on current main, by directory, with the place and seed of each failure, and file each as its own item"
area: release
kind: research
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-8defjq
pr: #4965
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T19:53:24.140Z
---

**What.** The unit suite run on current main (Oct 17, after the main at d8ff953760 plus the claims), by directory, with each red test and what it is. This replaces the stale #4309 (see release-green-suite). Each directory was run with `npx vitest run` and the JSON reporter, and each red test is named below with its place and seed. The core engine's 360 test files are not yet run; the next builder does that first.

**Rules.** Replace, never layer: a test that is red is fixed in place or filed as a pool item, never skipped or loosened to shorten the list. Look before you ask: each red test is checked against the register and the pool before it is filed.

**Done when.** Every test directory has been run on main and each red test is either fixed in the pull request or has its own pool item, named below.

**Files.** docs/pool/items/release-suite-red-list-on-main.md

**Notes.** Run with `npx vitest run <dirs> --maxWorkers=2 --reporter=json` on a 4-core container. Chunk 1, `src/director src/english src/bench` (77 files, 322 tests): 4 red. `src/bench/world-modules.test.ts` (openRestingStress not installed by buildBenchWorld, item release-world-modules-resting-stress-not-installed, #4906); `src/director/recall-override-scenes.test.ts` (raiseUnfilledPay assigns to a frozen row, fixed in #4893); `src/director/appointment-scenes.test.ts` (Butte City, Idaho, seed 068f93eaec28e94b22c007bae8e071806698ffcb: a confirmed governor's appointment gives no scene; new item director-appointment-scene-governor-none); `src/bench/dev-why.test.ts` (La Liga, Puerto Rico, seed 4b22c467924caecf: a person's year ledger lists pay, hours and cash, assertion at line 34; new item bench-dev-why-year-ledger-red). Chunk 2, `src/simulation tests scripts src/maps src/presentation` (114 files, 1,367 tests): 8 red, of which 7 are fixed in the branch claude/main-red-housekeeping: the American English sweep (15 British spellings in docs, a workflow comment, test comments and a FEMA fire name; the pool index is now exempt because it repeats an item's id), the player-facing American English test ("local authority" in two bill descriptions, now "local control"), the assumption markers (4 PLACEHOLDER markers in condition-pack.ts and death-causes.ts mapped), the placeholder ledger (regenerated), the merger skill (the Claude copy matches the Agents copy), the report standard (the table trace report's lead), and the civic coverage test (a cause may now match a record). The eighth, `scripts/dev-lab/e2e-shard-inventory.test.ts`, fails in this container only (`playwright test --list` stops on a missing Mac app bundle). Not yet run: `src/core2` (360 files), run it in chunks by file-name prefix.

Run Oct 19 (claude/political-game-pool-8defjq): `src/core2` on main, 21 of 32 chunks of 12 files (chunks 00 to 20, 252 test files, 1,619 tests), two workers, 4-core container: 11 red. Four are assertions and each has its own item: `budget-desk.test.ts` (no stories on the president's act; release-red-budget-desk-president-stories), `counted-weight-money.test.ts` (Unadilla, New York, seed 5a77dbcdef2b0732e8a0264421216708acfec92c0df37337f8480fed220214aa; release-red-counted-weight-money-opening-payroll), `electorate-weight.test.ts` (release-red-electorate-weight) and `housing-calibration.test.ts` (release-red-housing-calibration); their places and seeds were not printed. Seven are timeouts on the small container: `estate-contracts`, `groundwater-law`, `housing-laws`, `income-tax-played`, `moves-cash`, `office-proof` and `paid-leave` (release-core2-tests-time-out-on-small-container). Not yet run: chunks 21 to 31 (the last 124 files of the sorted list, from `src/core2/` file `office-proof` onward by name order); the background job reached its two-hour limit. The next builder runs those first, with `--maxWorkers=2 --reporter=json` on files `git ls-files 'src/core2/**/*.test.ts' | sort | tail -n 124`.
