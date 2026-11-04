# Lane 5 state

0 of 12 paths confirmed. Oldest open PR 0 days (#7172, Nov 4).

## Merged (built; each needs a session that didn't build it to confirm its path on main)

- Nov 3: #7140 the pool index is written on main only; #7141 the `new game` check (ruling 2); #7144 the stopgap register split into family files; #7145 no trailing space in pool fields; #7146 `docs/STATE.md`.
- Nov 4, about 03:30 UTC: #7148 the home-sale lender test uses the town's market; #7149 the campaign ad case passes over a rival with no platform; #7155 and #7158 browser checks play the President's address before testing (21 checks); #7161 Vitest reads JSON from disk (a worker starts at 386 MB, not 1,069).

## Open PRs

- #7172 `work-legacy-pay-mode-blocks-rehire`: a laid-off legacy-paid worker can be hired again. Oak Hills, Iowa no longer stops on 2026-02-02; Superior, Colorado runs to 2028.
- #7173 skills: start-life.mjs, shallow fetches, the storage guard.
- #7176 `core-group-quarters-population` (taken over from the speed lead): Storrs's year 142.9 s on main to 93.3 s; a place with no group quarters keeps identical records at the same speed; eviction filings 43.25 to 1.31 per 100. One known failing test, `housing-counted-evicted`'s Storrs rent-again step, whose premise was the student-eviction defect (explained in the PR).
- #7177 `core-opening-coverage-every-locality` (Touches): the every-locality script. 968 of 8,242 opened, none failed; the sweep continues in chunks.

## In progress

- Unit 9, `core-snapshot-cover-rest` on `lane-5/snapshot-cover`: decoder step pushed; the measure `snapshot-played.test.ts` (Phoenix, Arizona: 55 of 75 engines uncovered; 47 of 131 fields differ 45 days after a restore; the first split is day 1, a person's mood). Cause found: the story director's ledger lives in closures and isn't saved. Agreement proposed in `docs/lanes/agreements/3-5.md`; waiting on Lane 3 (asked on #7159).
- `core-played-game-saves-and-continues` filed: Continue is only the server's memory today.

## Failed or blocked

- `gh auth status`: the token is invalid; only search uses it.
- `docs/lanes/towns.md`: replay ab5f58e9be125c95 opens Old Forge, New York, not Haleyville, Alabama.
- `housing-counted-evicted` rent-again (above): twice, two different causes found; the decision is in #7176.

## Filed for others

- `play-news-reader-lead-without-text-crashes` (p1): clicking the first night's paper throws in `readerBody`.
- `tests-talk-history-one-exchange`, `tests-plain-text-no-travel-filing-place`, `tests-opening-address-skip-check-red`, `tests-played-world-no-rental-tiny-town` (M0-13, Rachel, West Virginia), `tests-electoral-scenes-speech-crowd-member`, `release-build-ships-nothing-from-the-workroom`.

## Next

- Unit 3 step 3: about 36 more browser checks that start a life through Continue, routes or the API.
- Unit 7: re-measure `core-speed-world-races-election-month` on main (`world-races.ts` is gone).
- Unit 9: the director's save once Lane 3 answers, then the measure again.
