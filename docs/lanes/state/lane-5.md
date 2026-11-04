# Lane 5 state

2 of 12 played paths confirmed. Oldest open PR 0 days (#7173, Nov 4).

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
- Cause found so far (probes in the scratchpad, Arcadia two years): the durable log goes from 7,073 rows to 224,834 in the election year, nearly all "circle" rows of people other than the player. The circle grows from 18 to 232 people, 201 of them level-0 contacts made during the campaign (`state.ts:1299` adds anyone the player has a tie with). Each member keeps a year of routine rows (median 461): drive.strengthened 42,954, speech.retold 35,029, resting 32,206, contacting someone they know 25,710, going to work 11,011. Next: bytes per table after three years (running), then a cut in `state.ts`/`decision-detail.ts` with its own card.

### Red main, Nov 4 06:45 (CTO's note)

- **Finish line:** deterministic validation green on main. **Proof:** each guard run locally on main, then on the fix. **Hands off:** other lanes' files; no baseline raised.
- #7190: Lane 5's part (families: group-quarters and stopgap files shared, place population and name data shared as reference, Lane 2's two files given a family, ten counts lowered; english: a verbatim quote allowlisted). Left for Lanes 1, 3 and 4, one line each, written on their state files and the desk page.
- Earlier today: #7181, #7182, #7183 (all merged).

### Unit 7, step: a met-once contact's routine log (started Nov 4 07:15)

- **Finish line:** Arcadia, California (0602462, seed app-heap-1) plays its fourth year at the app's 4,096 MiB limit without running out of memory, or the next table in the way is named.
- **Proof:** `speed-years/run.ts --years 4` at `--max-old-space-size=4096` on the branch against main's run above, heap and seconds per year; the durable log's member rows by age before and after.
- **Measured (probe, Arcadia, three years):** after year 3 the table JSON is about 1,795 MB, of which the durable log is 417 MB and `knowledgeByPerson` is 338 MB (1,932 people). Members' log rows: 95,966 older than six months, 41,549 three to six months, 53,940 younger.
- **The cut:** `circleActRetentionMonths` from 12 to 3, the low end of its own declared spread (TUNABLE, "checked against the memory check and the journal"). Readers of a member's row after its day: none outside debug views (`scene.ts` and the director's ledger read today's rows; `scheduling.ts` reads a moment's cause, staged within days). The player's own rows, public records and news are untouched.
- **Hands off:** the player's log; any public record or news row; the director's files.
- **Known cheats:** a bigger heap than the app has; dropping a row something reads; calling records "the same" when rows were dropped (they differ by design, so `--same-records` is not claimed).
- **Size:** one parameter row and its citation, under 20 lines. **Checked by:** a fresh session repeating the four-year run at 4,096 MiB on main after merge.
- Next, its own card: `knowledgeByPerson` (338 MB).

- **Result (#7198, merged):** at 4,096 MiB on 2088f4e82f, year 2 2,483 to 2,191 MB and 550.1 to 504.6 s (log 342,693 to 117,751 rows); year 3 2,687 to 2,436 MB and 347.4 to 277.0 s; year 4 still out of memory, about 11 minutes in instead of 6.

### Unit 7, step: the bare "I lived through it" keys (started Nov 4 07:35)

- **Finish line:** as the step above: Arcadia's fourth year at 4,096 MiB, or the next table named.
- **Measured (probe, Arcadia, two years):** `knowledgeByPerson` holds 722,306 keys after the election year (174,375 after year 1). Among the largest: event keys for speeches, campaign messages, shared causes and drive changes (about 140,000), heard promises (59,157 `promise:official:term:seat`), people met and named (106,000).
- **Result:** tried at 45 days (the monthly pass and its tests need more than 43); no measured gain (year 3 heap 2,444 MB against 2,436 MB without it), year 4 still out of memory. Not shipped; item back to open with the numbers.
- **Was:** `experiencedKeyRetentionDays` from 90 to 30, the low end of its declared spread. Its citation names its only readers: the same-day appraisal and a drive's update; a key a held drive cites is kept anyway (`knowledge-retention.ts`). The event's own facts and the player's keys stay.
- **Hands off / known cheats / checked by:** as the step above.
- **Size:** one parameter row, under 20 lines.

### Unit 7, step: the fourth year's peak (started Nov 4 08:35)

- **Measured (main d959cf9322, 8 GB heap, Arcadia's fourth year month by month):** heap after a full collection Feb 2,314 MB, Apr 2,629, Jun 2,849, Aug 3,013, Oct 3,259, Dec 3,064. The 4,096 MiB runs die in February to April, when the kept heap is only 2.3 to 2.6 GB, so a short-lived peak of more than a gigabyte is what runs out. Kept growth: campaign causes (to 590,717 rows before November's fold; Lane 1's `campaigns.ts`) and `knowledgeByPerson` (1.58 million keys by November). Numbers on `core-speed-large-town-year-heap-nightly`.
- **Tried:** a heap snapshot at the limit (`--heapsnapshot-near-heap-limit`): the container killed the process while writing it (exit 137, empty file).
- **Now:** a day-by-day probe from 2028-01-20 records each day's heap before and after collection and a sampling allocation profile of the heaviest day, to name the code that makes the peak.
- **Finish line, proof, hands off, cheats, checked by:** as the steps above. **Size:** the fix's own card once the code is named.

### Red main, Nov 4 09:45: builds stopped again (CTO's second note)

- **Found:** three more malformed declarations on main: `director-save-restore.md` (impact none, no reason), `official-pay-return.md` (a patch with no id, section or title), `screens-loading-worth-watching.md` (a 144-character title). #7224 fixed all three in one PR; the check over the whole range since v0.79.0 (c7ae16cfd9 to main 2a5885d) prints OK with 16 pending declarations, after #7222 and #7223 too.
- **The CTO's ruling on my proposal:** build neither; the desk runs the release check on each PR while merging and mends the note itself. Nothing for Lane 5 to build.
- After #7224 the next blocker was the build's typecheck: `src/bench/loading.test.ts` imported `PersonId` from a module that doesn't export it (Release run 12146). #7227 fixed it (merged 10:06); the full typecheck passes locally on main with it. Confirming a build publishes: Release run 12148, in progress.

### Red main, Nov 4 07:45: builds stopped (CTO's note)

- **Found:** every Release run on main since #7193 merged (06:43) fails at "Enforce declarations": runs 12112, 12114, 12115, 12116, 12117 and 12118, plus the two Release package runs (12111, 12113 cancelled). The first and the two newest logs read: `docs/release/changes/lane-2-first-minutes-proof.md: impact:none must not carry 'section' or 'title'`. The file came in with Lane 2's 3e377288ee. Newest build is still v0.78.0.
- **Fix:** #7201 drops the two lines; `release:check --mode pr` prints OK on it. After it merges I'll confirm that a Release run on main passes, in case another failure is behind this one.
- **Stopping it again without holding a merge (proposal for the CTO):** the declaration check could run in the `new game` job as a report only: it prints the release check's error into the job summary and the PR, without failing the job, so the desk sees it before merging. Or the push-mode check could set a malformed `impact: none` declaration aside with a warning instead of stopping the build, since such a file changes nothing a player sees. I have built neither; the second changes what the release check refuses, so it needs the CTO's word.
- **Confirmed:** after #7201, Release run 12122 passed and v0.79.0 was published (07:59 UTC).
- **A second cause right behind it:** run 12123 (#7204, Lane 4) stopped on `play-governor-races-on-screen`, an id an earlier release already consumed. #7206 gives the file its own id; `release:check` OK.
- **(Declined by the CTO, 09:42: the desk runs the check instead.)** Proposal was: a workflow on main, like the pool index one, that runs the release check after each merge and, when the only failures are mechanical (an `impact: none` file with a section or title, or an id already consumed), fixes the file and pushes the fix to main. It holds no merge (ruling 2) and needs no session awake. I can build it as a unit-1 item if the CTO agrees.
- #7200 merged (an office to approach needs staff).

### Unit 9: real save and load (in progress again)

- **Finish line (path 6):** play two months, quit, reopen: Continue returns the same date and people, and the load doesn't grow with played years.
- **Proof:** `snapshot-played.test.ts` on the played world (no field differs 45 days after a restore), and the bench's save and load route.
- **Hands off:** `src/director` (Lane 3's), except through `docs/lanes/agreements/3-5.md`.
- **Known cheats:** a save file the game never uses; a load that replays every day.
- **Size:** 17 to 27 hours. **Checked by:** a fresh session quitting and reopening in the browser.
- Lane 3 agreed and built the director's `save()`/`restore()` (merged 09:17). On `lane-5/snapshot-cover` (1bf44d035c) the measure now saves the director through v8 bytes and compares its fields: Phoenix, Arizona (seed snapshot-1), the worlds are identical right after the restore and no director field differs, but 48 of 142 fields still differ 45 days later. The first split is on day 1: in the original, `person_45670ca22bc4878f` is told two newspaper stories and weighs a claim three times; in the restored world those talks don't happen. Sent to Lane 3's state file with the ids; the core's free-time plans are saved and its caches are derived, so the talk state is the lead.
- Nov 4 10:50: the talk split was news's own state. A teller's carried parts and refused stories weren't saved, and two caches (recent heard, heard counts) were built from the rebuilt opening before the restore. With those fixed (#7229), the person's day-1 split is gone. The next split, also on day 1, is a cause drive's strength: the `runtimes` WeakMap in `src/core2/modules/drives.ts` (Lane 2's, `core2-drives-p10-v1` uncovered) isn't saved. Asked on Lane 2's state file.

## Open PRs

- None.
- Branch `lane-5/snapshot-cover` keeps the measure (`snapshot-played.test.ts`), not in a PR: it still fails until the drives runtime is saved.

## Merged

- Nov 3: #7140, #7141, #7144, #7145, #7146.
- Nov 4: #7148, #7149, #7155, #7158, #7161, #7172 (rehire), #7176 (group quarters: Storrs 142.9 s to 93.3 s), #7177 (every-locality sweep), #7180 (eight browser checks wait for filing), #7181 (Storrs eviction case, red main), #7182 (no-dice entry for sibling names, red main), #7183 (lane state files need no release declaration), #7190 (Lane 5's part of the red guards), #7173 (skills), #7198 (a met-once contact's log kept three months), #7200, #7201, #7206, #7210, #7221, #7224, #7225, #7227, #7229 (unit 9's restore step, 10:48).
- Nov 4 10:45: v0.80.0 published (Mac and Windows). Release package run 60 hit a GitHub 502 creating the release; rerunning the failed job published it.

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

## Confirmer

Replays by a session that built none of this lane's work, on main. Only this section is the Confirmer's.

- **Path 1, every place opens: pass.** Main d070e3d2d1, Nov 4. `npm run all-places -- --years 0 --seed confirmer-open-1`: one drawn locality in each of the 56 opened, 0 crashed, exit 0 in 562 s. Proof: `docs/lanes/proof/confirmer-lane5-path1/`. One locality per place; the 8,242-locality sweep stays the lane's.
  - Run again on main be9b5e649f (seed confirmer-open-2, after #7203 to #7217): 56 places, 0 crashed, exit 0; still a pass.
- **Path 2, a year doesn't stop: pass.** Main c60a509956, Nov 4. `speed:year --years 3` (January 2025 to January 2028): Madras, Oregon (4145250, seed confirmer-madras-1) 116.9, 307.4 and 329.6 s, past May 11, 2026; Bloomingdale, Tennessee (4706640, seed confirmer-bloomingdale-1) 105.4, 165.0 and 141.5 s. Both exit 0, nothing on stderr. Proof: `docs/lanes/proof/confirmer-lane5-path2/`.
  - Run again on main be9b5e649f, same seeds: Madras 121.2/320.5/358 s, Bloomingdale 111.3/156.8/139.9 s, both exit 0, nothing on stderr; still a pass.
- **Path 3, inside the bar: fail.** Main 8b24caf99e, Nov 4. `speed:year --years 4`: the drawn place (Melvina, Wisconsin, seed confirmer-speed-1) stays under 120 s (worst 73.1); the fixed towns don't: Haleyville 172.0 and 305.1, Meadow Lakes 579.6, Brookside 755.5 (2028), Storrs 124.8 and 142.7, Murray 124.1, D.C. 130.6 and 165.8 (stopped after year 2); Cabo Rojo and Santa Rita not run. The lane's unit 7 owns it. Proof: `docs/lanes/proof/confirmer-lane5-path3/`. Fail 1 of 3.
- **Path 12, merges don't collide: fail.** Nov 4, main 99d774785b. Step: the new-game check the only required one. `gh api repos/lamontaes/Political-Game-Git/branches/main/protection` lists the required checks as `validate` and `golden-path`; the `new game` job (#7141) is not among them, and every push to main prints "2 of 2 required status checks are expected". The two-PR merge half was not replayed (it needs two PRs merged, which the Confirmer doesn't do). Filed `release-main-requires-only-new-game-check` (a branch setting, the owner's one click per the merge desk page). Fail 1 of 3.
