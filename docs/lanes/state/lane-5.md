# Lane 5 state

0 of 12 played paths confirmed. Oldest open PR 0 days (#7173, Nov 4).

## Unit cards

Every unit gets one before it starts (lane page, CTO rule). Units 1 and 2 were started before the rule; their cards are written now from what was done.

### Unit 1: merges stop colliding (built; card on the lane page)

- **Finish line:** two PRs that both change pool items both land by ordinary merge, nothing lost. **Proof:** `scripts/pool/index-merge.test.ts` (#7140), the new-game check as one job (#7141), the stopgap register in family files (#7144). **Checked by:** a fresh session, and the desk's next conflict. Not yet confirmed.

### Unit 2: pool truth and one state page (in progress)

- **Finish line:** `docs/STATE.md` true on main; no claim older than 48 hours without a live branch; roadmap flags only from evidence.
- **Proof:** a list of every claimed item with its branch and last change; each stale claim released with a Notes line naming why.
- **Hands off:** another lane's live claim; any item's specs or done-when; deleting items.
- **Known cheats:** releasing a claim whose branch still has commits; closing an item without rerunning its done-when.
- **Size:** about 6 to 8 hours; pool edits only. **Checked by:** a session that didn't build it, reading STATE.md against the pool.
- Nov 4 05:45: `release-main-red-standing` released (branch gone, last handoff Nov 2). All other claims are less than a day old.

### Unit 3: screen checks see again (in progress)

- **Finish line (path 7):** five browser checks in three towns pass on main, the first click under 60 seconds.
- **Proof:** each check's run on main with its town and replay number; start-life.mjs is the one opening helper.
- **Hands off:** `src/bench` screens themselves (play-first lane); the words of any scene.
- **Known cheats:** skipping a step the check exists to test; a longer timeout instead of a cause; a check that passes because it checks nothing.
- **Size:** 8 to 10 hours, in steps under 400 lines (#7155, #7158, #7180 merged). **Checked by:** a fresh session running the five on main.
- Left: filing, office hours, election day, options, sheets, dev follow, polling, printed news (8 checks, other causes, listed in #7180).

### Unit 4: crashes a player can hit (in progress)

- **Finish line (paths 1 and 2):** every locality opens; Madras, Oregon and Bloomingdale, Tennessee play a full year.
- **Proof:** `npm run opening:every-locality` (#7177), resumable, naming each town that won't open; the two towns' years on main.
- **Hands off:** fixing a crash in another lane's engine (file it to that lane instead).
- **Known cheats:** skipping a town that fails; a catch that hides a crash.
- **Size:** mostly machine time, about 30 hours of sweep. **Checked by:** a fresh session rerunning a sample of the sweep's towns.
- Sweep: 986 of 8,242 opened, none failed. Paused at 05:32 for unit 7's run (one heavy process at a time); it resumes where it stopped.

### Unit 7: big towns and election years (in progress)

- **Finish line (paths 3 and 4):** Arcadia, California and Chamblee, Georgia play four years at the shipped app's memory limit with no out-of-memory; every year under the bar.
- **Proof:** `speed:year` on main at that limit, four years, place and seed named, heap and seconds per year.
- **Hands off:** game rules; any engine's output (a cut must keep the same records, `--same-records`).
- **Known cheats:** timing a town when the bar is a country's year; leaving a slow town out; a bigger heap than the app has.
- **Size:** 15 to 20 hours; each cut its own PR under 400 lines. **Checked by:** a fresh session repeating the run on main.
- The shipped app's limit, measured: Electron 38.4.0's play-server utility process has a heap limit of **4,096 MiB** (`v8.getHeapStatistics()` inside `utilityProcess.fork`, same flags as `desktop/play-api-client.mjs`; the app sets no heap flag).
- Arcadia (0602462, seed app-heap-1, main 44f14801eb, 4,096 MiB): built 24.9 s; year 1 145.3 s, heap 1,041 MB; year 2 (election) 550.1 s, 2,483 MB, durableLog 342,693 rows; year 3 347.4 s, 2,687 MB; **year 4 ran out of memory** a few minutes in. Owner notified.
- Cause found so far (probes in the scratchpad, Arcadia two years): the durable log goes from 7,073 rows to 224,834 in the election year, nearly all "circle" rows of people other than the player. The circle grows from 18 to 232 people, 201 of them level-0 contacts made during the campaign ( adds anyone the player has a tie with). Each member keeps a year of routine rows (median 461): drive.strengthened 42,954, speech.retold 35,029, resting 32,206, contacting someone they know 25,710, going to work 11,011. Next: bytes per table after three years (running), then a cut in / with its own card.

### Red main, Nov 4 06:45 (CTO's note)

- **Finish line:** deterministic validation green on main. **Proof:** each guard run locally on main, then on the fix. **Hands off:** other lanes' files; no baseline raised.
- #7190: Lane 5's part (families: group-quarters and stopgap files shared, place population and name data shared as reference, Lane 2's two files given a family, ten counts lowered; english: a verbatim quote allowlisted). Left for Lanes 1, 3 and 4, one line each, written on their state files and the desk page.
- Earlier today: #7181, #7182, #7183 (all merged).

### Unit 9: real save and load (waiting on Lane 3)

- **Finish line (path 6):** play two months, quit, reopen: Continue returns the same date and people, and the load doesn't grow with played years.
- **Proof:** `snapshot-played.test.ts` on the played world (no field differs 45 days after a restore), and the bench's save and load route.
- **Hands off:** `src/director` (Lane 3's), except through the agreement in `docs/lanes/agreements/3-5.md`.
- **Known cheats:** a save file the game never uses; a load that replays every day.
- **Size:** 17 to 27 hours. **Checked by:** a fresh session quitting and reopening in the browser.
- Phoenix, Arizona: 55 of 75 engines uncovered; first split is day 1, the director's ledger, which lives in closures and isn't saved. Asked on #7159.

## Open PRs

- #7190 (red main): Lane 5's part of the red guards.
- #7173 skills: start-life.mjs, shallow fetches, the storage guard. Desk check passed; the CTO merges skills.

## Merged

- Nov 3: #7140, #7141, #7144, #7145, #7146.
- Nov 4: #7148, #7149, #7155, #7158, #7161, #7172 (rehire), #7176 (group quarters: Storrs 142.9 s to 93.3 s), #7177 (every-locality sweep), #7180 (eight browser checks wait for filing), #7181 (Storrs eviction case, red main), #7182 (no-dice entry for sibling names, red main), #7183 (lane state files need no release declaration).

## Failed or blocked

- `gh auth status`: the token is invalid; only search uses it.
- `docs/lanes/towns.md`: replay ab5f58e9be125c95 opens Old Forge, New York, not Haleyville, Alabama.

## Agreements made

- Lane 2, on #7173: Lane 2 lowers `src/core2/modules/press.ts` 16 to 15 in `tests/guards/families-baseline.json`, in its counted-news PR only.

## Filed for others

- `play-news-reader-lead-without-text-crashes` (p1), `tests-talk-history-one-exchange`, `tests-plain-text-no-travel-filing-place`, `tests-opening-address-skip-check-red`, `tests-played-world-no-rental-tiny-town`, `tests-electoral-scenes-speech-crowd-member`, `release-build-ships-nothing-from-the-workroom`.

## Next

- Unit 7: finish Arcadia and Chamblee at 4,096 MiB; file or fix what grows in the election year (Nov 1 note: durableLog, foldedCauses, doors).
- Unit 4: resume the sweep after unit 7's run.
