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

- `lane-5/legacy-pay-ends-with-job` (`work-legacy-pay-mode-blocks-rehire`): on main, Oak Hills, Iowa stops on 2026-02-02; with the fix it reaches 2026-06-03, and `person_318925d9787653e7` holds payroll job `job:position:organization_6bd731cdf9b572c4:2025-08-01:1:person_318925d9787653e7` after their legacy job ended 2026-02-02. Superior, Colorado runs 2025 to 2028-01-01 with no throw.
- `lane-5/skills-nov3`: skill lines (start-life helper; shallow fetches; storage guard override).

## Filed for others (lead play)

- `play-news-reader-lead-without-text-crashes` (p1): clicking the first night's paper throws in `readerBody`.
- `tests-talk-history-one-exchange`, `tests-plain-text-no-travel-filing-place`, `tests-opening-address-skip-check-red`.

## Failed

- `gh auth status`: the token is invalid. Only search uses it.
- `docs/lanes/towns.md`: replay ab5f58e9be125c95 opens Old Forge, New York, not Haleyville, Alabama. The fixed towns need picking again in the Advanced picker.
- This cloud copy is shallow: each pool command's `git fetch origin main` can take minutes (385k objects once), and the storage guard needs the override for every bench start.

## Next

- `release-audit-07-08`: answered by `docs/packages/M7-early-access.md` line 88; it belongs to launch preparation.
- Replay M0-13 in Rachel, West Virginia on main (red main?).

- Unit 3 rest, then `tests-filing-browser-cold-bench-timeouts` and `tests-election-browser-checks-red-on-main`.
- Unit 4: `core-press-staff-counted-job-not-resident` (a 24-minute repro), `work-legacy-pay-mode-blocks-rehire`, `core-relocation-job-held-intermittent`, `core-opening-coverage-every-locality`.
- `core-stopgap-never-hit-audit` now that the register is split.
