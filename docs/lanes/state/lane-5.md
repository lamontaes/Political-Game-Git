# Lane 5 state

0 of 12 paths confirmed. Oldest open PR 0 days.

## Works (built and merged; not yet confirmed by another session)

- Cloud trial, Nov 3: install, bench, New game → Start a life → Oxford, Idaho → the opening on Jan 20, 2025. `trial/lane-5` pushed.
- Path 12, merges don't collide: #7140 merged (the pool index is written on main only, by the Pool index workflow; a branch never changes it), #7144 merged (the stopgap register is 40 family files; the desk's conflict resolution kept all 691 rows, checked against main's side). #7141 merged: the one `new game` check (ruling 2), green on GitHub. The owner was asked to make it the only required check (branch protection).
- Path 11, the record is true: #7146 merged (`docs/STATE.md`, every bullet sourced, with a test). The pool truth pass is on main at f429f50bb6: 7 claims set in-pr, 1 done on the owner's close, 4 stale claims released, 56 leftover claims moved to Notes. `elections-past-race-votes-from-electorate` was reopened (#7088 merged as "Touches").
- #7145 merged: an inserted empty pool field has no trailing space.

## Open PRs

- #7148 `home-sale-outside-lender-two-outside-accounts`: the test fixture picked an out-of-town employer as the lender; it now uses `townOutsideOf`, as play does. It failed on every seed on main; 5 of 5 pass now.
- #7149 `tests-campaign-turn-rival-question-undefined`: the ad case passes over a rival with no platform (Cleveland, North Dakota); 11 of 11 on the item's seed and on ten fresh seeds.

## In progress

- Unit 3, `play-browser-checks-open-on-the-address`, branch `lane-5/browser-checks-address`: shared `src/bench/start-life.mjs` (`startLife`, `playOpening`, `finishTalk`). person-card passes again on a fresh life (Elton, Louisiana, 7f601c91-5645-41c8-806a-9b10700c09e7). The five named checks plus opening-address are running in three fresh rounds. Next step: the other checks that start a life, about 58 more files, in steps of about 400 lines.

## Failed

- `gh auth status`: the token is invalid. Only search uses it.
- `docs/lanes/towns.md`: replay ab5f58e9be125c95 opens Old Forge, New York, not Haleyville, Alabama. The fixed towns need picking again in the Advanced picker.
- This cloud copy is shallow: each pool command's `git fetch origin main` can take minutes (385k objects once), and the storage guard needs the override for every bench start.

## Next

- Unit 3 rest, then `tests-filing-browser-cold-bench-timeouts` and `tests-election-browser-checks-red-on-main`.
- Unit 4: `core-press-staff-counted-job-not-resident` (a 24-minute repro), `work-legacy-pay-mode-blocks-rehire`, `core-relocation-job-held-intermittent`, `core-opening-coverage-every-locality`.
- `core-stopgap-never-hit-audit` now that the register is split.
