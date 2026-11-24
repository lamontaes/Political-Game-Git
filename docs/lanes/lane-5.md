# Lane 5: Engine and release (194 items)

**What the player gets.** A year that never stops dead. Big towns and election years inside the speed bar. Quit and come back to the same life. Saves that stay fast past year 20. Builds, updates and a bug button that work. For the crew: merges that stop colliding, checks that see screens again, and a record that tells the truth. A player feels about 70 of these hours and none of the rest.

**Finish line: 12 played paths.** Some end in a printed run log; where a player sees it, the path says so.

1. **Every place opens.** Start: the all-towns run. See: all 56 open with no crash.
2. **A year doesn't stop.** Start: Madras, Oregon and Bloomingdale, Tennessee. See: a full year past the old crash points (May 11, 2026 in Madras).
3. **Inside the bar.** Start: `npm run speed:year`, plus the eight towns. See: a country's year under two minutes, including an election year. Today 57 s typical, 113 s election, 860 s worst.
4. **Big towns.** Start: Arcadia, California and Chamblee, Georgia, at the shipped app's real memory limit. See: no out-of-memory; Storrs near 75 s, not 272.
5. **Long saves.** Start: a 40-year run. See: no crash (today year 19), year 18 no longer 6 to 7 minutes, then years 97-100 at most 1.2 times years 1-4, by your Oct 30 bar.
6. **Quit and come back (you can play this).** Start: play two months, quit, reopen. See: Continue returns the same date and people, and the load doesn't grow with played years.
7. **Screen checks see.** Start: five browser checks in three towns. See: each passes, the first click under 60 seconds.
8. **By-draw sweep.** Start: every pinned draw on main. See: green ones closed, one shared draw helper, the rest with an owner and a reason. Up to five may be real bugs.
9. **Money balances.** Start: the yearly money check. See: it reads true, the $4.39 trillion federal line explained.
10. **A build ships.** Start: a Mac build. See: installs, opens, update dialogs in words, a bug report sent only on press, no workroom notes inside.
11. **The record is true.** Start: `docs/STATE.md`. See: furthest step, newest build, who owns what, stale claims gone, roadmap flags from real evidence.
12. **Merges don't collide.** Start: two pull requests changing pool items and the temporary-fix list. See: both merge, no Notes lost, the new-game check the only required one.

**The work, in order**

1. **Merges stop colliding** (5, 3-5 h for the merge fixes, my narrowing of Report E's 8-12). `pool-generated-index-merge-starvation`, `pool-empty-field-trailing-whitespace`, `tooling-stopgaps-register-per-family` (once the queue is mostly merged), `core-stopgap-never-hit-audit`. Plus the new-game check as one job.
2. **Pool truth and one state page** (9, 6-8 h). This takes in the old reorganization prompt: close what a spot-check confirms, release stale claims, `docs/STATE.md`, roadmap flags, the roadmap rewrite as OWNER LOOK. `roadmap-m0-flip-proven-five`, `roadmap-m1-flip-proven-three`, `docs-stale-2026-10-23-audit`, `release-repo-large-files`, `core-city-treasury-trillions-dickens`.
3. **Screen checks see again** (6, about 8-10 h). `play-browser-checks-open-on-the-address` first, then `tests-filing-browser-cold-bench-timeouts`, `tests-election-browser-checks-red-on-main`.
4. **Crashes a player can hit** (6, 15-20 h). `core-press-staff-counted-job-not-resident` (its note wrongly says old branch only), `work-legacy-pay-mode-blocks-rehire`, `core-relocation-job-held-intermittent`, `home-sale-outside-lender-two-outside-accounts`, `tests-campaign-turn-rival-question-undefined`, `core-opening-coverage-every-locality`.
5. **Memory savers** (6, about 6 h; #7102, #7128 to #7130, #7110 and `speed/fold-race-close-rows` hold the build, saving 3). `core-long-run-closed-race-rows-fold`, `core-long-run-campaign-money-rows`, `core-long-run-race-close-campaign-rows`.
6. **Test machine memory** (7, 8-12 h). A test worker holds 1.28 GB before any test. `tests-vitest-import-baseline-heap`, `core-committee-world-debug-heap`.
7. **Big towns and election years** (7, 15-20 h; `speed/group-quarters-population` saves 8-10). `core-group-quarters-population`, `core-speed-world-races-election-month`, `core-m7-01-speed-and-memory`.
8. **By-draw sweep** (6 plus all 49 test-only, 30-40 h, mostly machine). 22 assume the town has something it may not, 7 check a range on too small a sample, 6 lag a rule or screen. `release-main-red-standing`, `tests-early-returns-office-proof-staging`. Look first at the five that may be real: `death-cause-tests-red-by-draw`, `tests-party-filing-no-join-in-six-draws`, `elections-campaign-turn-raise-money-by-seed`, `bank-month-test-no-household-month-row`, `tests-world-moments-husk-mover-oak-grove`.
9. **Real save and load** (with 11: 4 items; 17-27 h; `claude/snapshot-cover-s5` saves 2-4). `core-snapshot-cover-rest`, `core-m7-02-saves-that-last`. No pool item covers the played game's route; file it.
10. **Long saves** (7, 33-43 h; two small branches save 1-2). `core-long-run-tables-grow-with-history`, `core-long-run-election-and-term-rows`. File campaign-promise compaction (611,382 records at year 18) and the long-run check you ruled.
11. **Shipping** (30+ h, mostly after the paths). `release-audit-07-08-duplicate-pool-and-owner-notes`, `release-m7-04-updates-and-bug-reports`. File "nothing from the workroom."
12. **Small speed cuts,** later (7 Later items, 20-30 h). `core-speed-allocation-volume-flat`. Perhaps 15 percent off dense towns.
13. **Sourced numbers,** later (9, 35-55 h). `research-stopgaps-oct19-apply` first, since 112 values are already researched. Nothing on screen changes.
14. **Lighter opening,** later (5, 12-16 h). `core-light-opening`. Moves up if big towns keep failing while building, as two did Nov 2.

**Close 30:** 17 done (`carcass-audit-everything-not-engine-view-or-guard`) and 13 needing one rerun. **Drop 19:** cuts whose own notes say about 3 percent, old audit leftovers, an item titled "x", `core-sleep-reserve-by-person`. **Test-only 49:** see unit 8. **Later 18:** units 12 and 13 in part, plus legal check and updates. **Slim 12:** report a too-slow town as unmeasured rather than building a guard; one sweep of towns that won't open. **Ask 1:** `core-snapshot-cover-rest`, answered: build it.

**Out of scope:** game features, Steam, art, deleting branches without your word (the owner's word), history rewrites without your word.

**Owned files:** `src/core2/{state,life,calendar,journal,accounts,saves,focus}.ts`, `src/core2/data/stopgaps.json`, `src/core2/data/parameters.json`, `scripts/`, `tests/`, `.github/workflows/`, `desktop/`, `docs/pool/`, `docs/roadmap/`, `docs/STATE.md`.

**Handoffs:** Lane 1, `1-5.md`. Lane 2, `2-5.md`. Lane 4, `4-5.md`. May edit test helpers in any lane's folder; the second to merge updates.

**Open-work limit:** 3 to 5; 48-hour rule. **Stop rule:** all 12 confirmed by a non-builder; then units 12 to 14 and others' open items. **Status line:** "0 of 12 played paths confirmed. Oldest open PR N days."

**First card: merges stop colliding** (`pool-generated-index-merge-starvation`)

- **Finish line:** two pull requests that both change pool items both land by ordinary merge, with nothing lost.
- **Proof:** the item's test: concurrent status edits plus a planning change adding items, both landing with no lost Notes, claims or specs; a regenerated index exactly matches main after each step. Show it failing first.
- **Hands off:** pool validation stays strict; never hand-merge the index or force-push; the merge desk works beside you.
- **Known cheats:** removing the index from the check, dropping Notes, leaving the temporary-fix list split until the queue has drained (the Oct 31 work order's timing).
- **Size:** about 2-3 hours, my estimate.
- **Save, if stuck, hand-in:** as Lane 1's card, in `docs/lanes/state/lane-5.md`. **Checked by:** a fresh session, and the desk's next conflict.

**Every later unit gets the same card.** Before starting a unit, write its card in `docs/lanes/state/lane-5.md` from this page and the unit's pool items: finish line, proof, hands off, known cheats, size, checked by. Split it if it grows past about 400 changed lines. A unit with no card isn't started.
