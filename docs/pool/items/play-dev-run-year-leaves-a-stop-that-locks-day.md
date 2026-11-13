---
id: play-dev-run-year-leaves-a-stop-that-locks-day
title: 'After dev mode''s Run a year, Day and Week do nothing and the card reads "Player stop clock cannot cross an unresolved stop." (French Island, Wisconsin)'
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: none
checked: fable
source: Playtester P2, Nov 13 (French Island, Wisconsin, seed 49f52639-1873-49db-9500-bac35d6dc22b)
---

**What.** On main 5e68cde1, an Advanced start in French Island, Wisconsin (seed 49f52639-1873-49db-9500-bac35d6dc22b), as County Commissioner Anika Emerson. I played twelve days to Friday, January 31, 2025, then used dev mode's Run a year (`POST /api/dev/run-year`, which answered `{"ran":true,"from":"2025-02-01","to":"2026-02-01"}`). From then on every press of Day answers `400 {"error":"Player stop clock cannot cross an unresolved stop."}`. The card's place line shows that sentence instead of "French Island, Wisconsin", no Continue appears, and the clock stays at "Sunday, February 1, 2026 8:30 PM". Three more years of Run a year left it the same (still stuck at Tuesday, February 1, 2028 8:30 PM). The same run-year in Hewitt, New Jersey (seed bf6b1bd7-4b1b-4fd7-92f9-6c5ec310f7b0) did not lock. Seen: after Run a year, Day moves the clock and the card names the place.

**Cause.** Found in code: `release()` in `src/bench/player.ts` (line 140), called first by `runYear()` in `src/bench/dev-mode.ts` (line 1803), finishes the day and retires the core's player clock (`retirePlayerV1`). It never releases or acknowledges the module stops already registered for the controlled person in the stop registry (`src/core2/player-stops-v1.ts`), such as a director interrupt that `registerInterrupts` (`src/director/ledger.ts` line 1641) set for the next morning. Once the year has run, that stop is dated before the clock. The next play advance binds the clock again (`bindModuleStopClockV1`, `player-stops-v1.ts` line 494), and the binding throws because the earliest registered stop is behind it. `/api/title` carries no stop packet for it, so the page cannot show Continue (`resyncOpenStop` in `play.mjs`), and `act` writes the error into `#card-place`.

**Fix.** Release, at the same moment as the clock (in `release()`, after `finishDay`), every module stop the controlled person still has in the registry, using the registry's own call for a client acknowledgment (`acknowledgeModuleStopsV1`). The person's days until the next bind are lived on their own choices, as `release()`'s comment says, so a stop for those days has nobody to answer it. Test: a played world in a drawn place with a director interrupt pending for the next morning; run `runYear()`, then `advance("day")`, and the clock moves.

**Time box.** 2 hours

**Rules.** One rule, all 56 places: the stops are released for whoever the player controls, in any place, never for a named case. No hand-written player text: no developer error sentence reaches the card; play-first LAW, a stop the player cannot get past is a defect.

**Done when.** The new test passes in two drawn places, and a second session sees, on the bench on main, a drawn Advanced start played a few days, then dev mode's Run a year, then Day, with the clock moving to the next morning and the card naming the place.

**Waits on.** Nothing.

**Files.** src/bench/player.ts, src/core2/player-stops-v1.ts (read only), src/bench/dev-mode.ts (read only), a new test beside src/bench/dev-run-year.test.ts

**Notes.** The same sentence was seen on Nov 10 after starting several dev mode scenes in a row (Notes of play-talk-opens-with-no-line-after-a-year), so that path may share this cause. Replay with `BENCH_SEED=49f52639-1873-49db-9500-bac35d6dc22b`, step in as the first Commissioner, press Day twelve times, then Run a year.
