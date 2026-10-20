---
id: release-suite-red-list-on-main
title: "List the red tests on current main, by directory, with the place and seed of each failure, and file each as its own item"
area: release
kind: research
priority: 2
size: M
status: claimed
claimed-by: claude/red-list
pr: #5080
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T15:52:28.199Z
---

**What.** The unit suite run on current main (Oct 17, after the main at d8ff953760 plus the claims), by directory, with each red test and what it is. This replaces the stale #4309 (see release-green-suite). Each directory was run with `npx vitest run` and the JSON reporter, and each red test is named below with its place and seed. The core engine's 360 test files are not yet run; the next builder does that first.

**Rules.** Replace, never layer: a test that is red is fixed in place or filed as a pool item, never skipped or loosened to shorten the list. Look before you ask: each red test is checked against the register and the pool before it is filed.

**Done when.** Every test directory has been run on main and each red test is either fixed in the pull request or has its own pool item, named below.

**Files.** docs/pool/items/release-suite-red-list-on-main.md

**Notes.** Run with `npx vitest run <dirs> --maxWorkers=2 --reporter=json` on a 4-core container. Chunk 1, `src/director src/english src/bench` (77 files, 322 tests): 4 red. `src/bench/world-modules.test.ts` (openRestingStress not installed by buildBenchWorld, item release-world-modules-resting-stress-not-installed, #4906); `src/director/recall-override-scenes.test.ts` (raiseUnfilledPay assigns to a frozen row, fixed in #4893); `src/director/appointment-scenes.test.ts` (Butte City, Idaho, seed 068f93eaec28e94b22c007bae8e071806698ffcb: a confirmed governor's appointment gives no scene; new item director-appointment-scene-governor-none); `src/bench/dev-why.test.ts` (La Liga, Puerto Rico, seed 4b22c467924caecf: a person's year ledger lists pay, hours and cash, assertion at line 34; new item bench-dev-why-year-ledger-red). Chunk 2, `src/simulation tests scripts src/maps src/presentation` (114 files, 1,367 tests): 8 red, of which 7 are fixed in the branch claude/main-red-housekeeping: the American English sweep (15 British spellings in docs, a workflow comment, test comments and a FEMA fire name; the pool index is now exempt because it repeats an item's id), the player-facing American English test ("local authority" in two bill descriptions, now "local control"), the assumption markers (4 PLACEHOLDER markers in condition-pack.ts and death-causes.ts mapped), the placeholder ledger (regenerated), the merger skill (the Claude copy matches the Agents copy), the report standard (the table trace report's lead), and the civic coverage test (a cause may now match a record). The eighth, `scripts/dev-lab/e2e-shard-inventory.test.ts`, fails in this container only (`playwright test --list` stops on a missing Mac app bundle). Not yet run: `src/core2` (360 files), run it in chunks by file-name prefix.

Run Oct 19 to 20 (claude/political-game-pool-8defjq): all of `src/core2` on main, 376 test files in 32 chunks of 12, two workers, 4-core container, 2,245 tests: 19 red. Eight are assertions, each its own item: `budget-desk.test.ts` (release-red-budget-desk-president-stories), `counted-weight-money.test.ts` (Unadilla, New York, seed 5a77dbcdef2b0732e8a0264421216708acfec92c0df37337f8480fed220214aa; release-red-counted-weight-money-opening-payroll), `electorate-weight.test.ts` (release-red-electorate-weight), `housing-calibration.test.ts` (release-red-housing-calibration), `press-turnover.test.ts` (seed 2dd07ef95278f4ef; release-red-press-turnover-reporter-replacement), `profit-pass-through.test.ts` (Mantoloking, New Jersey, seed 40a6340376bb8deb9116120b34d4e90e238483e1; release-red-profit-pass-through-counted-owner-filled-in), `record.test.ts` (release-red-record-broken-promise-voters), `service-charges-data.test.ts` (Berry, Kentucky, seed ce65df0e4a98d185f9843fabea23f7bb; release-red-service-charges-census-totals) and `vote-level.test.ts` (place 4728060, seed 5e9b2e25f59cca2921bd22a176389baf75adf7e9; release-red-vote-level-organizing-filed). Ten are timeouts on the small container, in one item (release-core2-tests-time-out-on-small-container). Places and seeds for budget-desk, electorate-weight, housing-calibration and record were not printed by their failures. The profit-pass-through failure was reproduced with its seed and also with main's versions of the files the column-read change touches (PR 5080), so that change does not cause it. The other directories were run by the earlier chunks of this note.

Sent back 2026-10-20 from PR #5007 (branch claude/dev-why-red): Morning check: the dev-why ledger test now chooses a worker by whether why(p.id) already renders a pay row, then falls back to a person without itemized receipts when no such worker exists. If pay rendering breaks for every paid worker, the positive pay assertion can disappear and the negative fallback can pass. Choose the paid worker from actual payroll/cash-journal source records, require or draw an eligible positive case, and assert the rendered pay row independently; preserve the separate unitemized-receipt case.; finish on that branch, merge main into it first. Current replacement claim and PR are preserved.

Sent back 2026-10-20 from PR #5080 (branch claude/political-game-pool-8defjq): merging main still conflicts in scripts/health/mortality-band.ts and src/core2/player-money-year.test.ts; finish on that branch, merge main into it first.
