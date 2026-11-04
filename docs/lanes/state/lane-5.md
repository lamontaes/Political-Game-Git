# Lane 5 state

0 of 12 paths confirmed. Oldest open PR 1 day (#7148, Nov 3).

## Works (built and merged; not yet confirmed by another session)

- Cloud trial, Nov 3: install, bench, New game → Start a life → Oxford, Idaho → the opening on Jan 20, 2025. `trial/lane-5` pushed.
- Path 12, merges don't collide: #7140 merged (the pool index is written on main only, by the Pool index workflow; a branch never changes it), #7144 merged (the stopgap register is 40 family files; the desk's conflict resolution kept all 691 rows, checked against main's side). #7141 merged: the one `new game` check (ruling 2), green on GitHub. The owner was asked to make it the only required check (branch protection).
- Path 11, the record is true: #7146 merged (`docs/STATE.md`, every bullet sourced, with a test). The pool truth pass is on main at f429f50bb6: 7 claims set in-pr, 1 done on the owner's close, 4 stale claims released, 56 leftover claims moved to Notes. `elections-past-race-votes-from-electorate` was reopened (#7088 merged as "Touches").
- #7145 merged: an inserted empty pool field has no trailing space.

## Open PRs (all wait on the owner's click; the desk may not merge lane PRs outside his Nov 3 list)

- #7148 `home-sale-outside-lender-two-outside-accounts`: the test's lender is now the town's outside market, as in play. Its `golden-path-year` red is M0-13 in Rachel, West Virginia, which this PR can't touch (commented).
- #7149 `tests-campaign-turn-rival-question-undefined`: the ad case passes over a rival with no platform; 11 of 11 on 11 seeds. Desk: checked, new game passed (Torreon, New Mexico, 587151fadb62ef34).
- #7155 and #7158 (Touches `play-browser-checks-open-on-the-address`): `src/bench/start-life.mjs`; 21 checks play the opening first. person-card and panels pass 3 of 3, plus 10 more once each. The rest fail past the address on filed causes.
- #7161 `tests-vitest-import-baseline-heap`: Vitest reads JSON from disk; a worker starts at 386 MB, not 1,069.

## Built, waiting for a PR slot

- `lane-5/legacy-pay-ends-with-job` (`work-legacy-pay-mode-blocks-rehire`): Oak Hills, Iowa no longer stops on 2026-02-02; Superior, Colorado runs to 2028-01-01.
- `lane-5/skills-nov3`: skill lines.
- `lane-5/opening-every-locality` (`core-opening-coverage-every-locality`): a resumable script; the sweep is running in chunks (about 100 of 8,242 county-governed localities opened, none failed so far; paused whenever another heavy run needs the machine).

## In progress

- `speed/group-quarters-population` (`core-group-quarters-population`, taken over from the speed lead): main merged in, the eviction band set by the Nov 2 ruling, residents of rooms outside the labor force kept out of staff and public posts. group-quarters.test passes on 3 seeds. One test left: `housing-counted-evicted`'s rent-again step needs a place with an evicted household that has pay, now that Storrs's students aren't evicted. Then the Storrs and zero-group-quarters measurements, then the PR.
- Unit 9, `core-snapshot-cover-rest` on `lane-5/snapshot-cover`: step 1 pushed (the decoder change). The measure is `snapshot-played.test.ts`. Played-world baseline in Phoenix, Arizona: 55 of 75 engines uncovered, and 47 of 131 saved fields differ 45 days after a restore. Identical right after the restore; the split starts on day 1 with a person's mood. Cause found: the story director's ledger lives in closures and isn't saved. Agreement proposed in `docs/lanes/agreements/3-5.md` (Lane 3 owns `src/director`); waiting on Lane 3's answer, asked on #7159.
- `core-played-game-saves-and-continues` filed: Continue today is only the server's memory.

## Found and fixed in my own tools

- `scripts/stopgaps-move-old.ts` (merged in #7144) reverted rows main had changed since a branch was cut. The fix (merge base plus field-by-field) rides on the group-quarters branch, and the desk was warned on #7144.

## Filed for others (lead play)

- `play-news-reader-lead-without-text-crashes` (p1): clicking the first night's paper throws in `readerBody`.
- `tests-talk-history-one-exchange`, `tests-plain-text-no-travel-filing-place`, `tests-opening-address-skip-check-red`.

## Failed

- `gh auth status`: the token is invalid. Only search uses it.
- `docs/lanes/towns.md`: replay ab5f58e9be125c95 opens Old Forge, New York, not Haleyville, Alabama. The fixed towns need picking again in the Advanced picker.
- This cloud copy is shallow: each pool command's `git fetch origin main` can take minutes (385k objects once), and the storage guard needs the override for every bench start.

## Next

- `release-audit-07-08`: answered by `docs/packages/M7-early-access.md` line 88 (launch preparation). `release-build-ships-nothing-from-the-workroom` filed.
- M0-13 red in Rachel, West Virginia reproduces on main: filed `tests-played-world-no-rental-tiny-town`. The press-staff crash doesn't reproduce on main; `tests-electoral-scenes-speech-crowd-member` filed.

- Unit 3 rest, then `tests-filing-browser-cold-bench-timeouts` and `tests-election-browser-checks-red-on-main`.
- Unit 4: `core-press-staff-counted-job-not-resident` (a 24-minute repro), `work-legacy-pay-mode-blocks-rehire`, `core-relocation-job-held-intermittent`, `core-opening-coverage-every-locality`.
- `core-stopgap-never-hit-audit` now that the register is split.
