---
id: tests-door-pledge-turnout-race-open-by-draw
title: "The door-pledge turnout test finds a race in one of twelve drawn places and fails on a seed where the other eleven have nothing open yet"
area: elections
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
source: Merger codex-1251 gating #8580, Nov 12 (CTO order on issue #7365, 17:24Z)
after:
lead: governing
model: sonnet
effort: medium
root: none
checked: fable 2026-11-12
---

**What.** `src/core2/door-pledge.test.ts` fails on clean main (33e38d44bc) at line 480, `expect(places).toBe(3)`, on `GOLDEN_PATH_SEED=f26db0f13c6bffec4a68430111c0bdb5`: of its twelve drawn places only Yellow Bluff, Alabama (0183976) gives a race two residents can file for (32 of 41 holding a yes voted, 7 of 16 others); the other eleven (3427030, 1207375, 4079800, 0265800, territory:GU:tamuning, 4149600, 5308770, 2525172, 2378535, 5124752, 1577750) each print "no race two residents could file for". The weighted-household test of the same file fails on that seed too ("no drawn town had a weighted counted record that a door reached and that votes in the race"), for the same reason. Seen: no player screen; the door-yes turnout check (the pledged vote more than their neighbors) is what the test guards.

**Cause.** Measured: on main, by a scratch copy of `filedRace` that printed `openContests` for the twelve draws: the eleven places each have no open contest at all (`contests` empty), while Yellow Bluff has the Alabama state races open (governor, lieutenant governor, attorney general and others, 2026-11-03). `filedRace` (door-pledge.test.ts:81) builds the world on `START = "2026-01-05"` (line 49) and files only for what `openContests` (src/core2/modules/elections.ts:786) lists that day, which is a contest whose `filingOpens` is on or before today and whose `filingDeadline` has not passed. Each contest's `filingOpens` comes from the nomination calendar's own dates (src/core2/elections-calendar.ts:462, `qualifyingOpens`; elsewhere the estimate at elections.ts:632). Most places' and states' windows open later in 2026; Alabama's was already open on January 5. So the share of places with a race on day one is the share whose calendar has a window open on January 5, which is what the engine should produce: a window that opens in March is not open in January, and the qualifying rule is right. The test is wrong: it never moves the clock, though the file `src/core2/gov-test-clock.ts` already holds `advanceToFilingOpen(core)`, written for this ("a test that needs a contest to file for moves the clock to the first day one opens"), and `campaigns.test.ts`, `campaign-turn.test.ts` and `elections-filing.test.ts` use it. The first test of the file (line 131) draws the same way and passes only by seeds that land on an open window. The weighted test (line 497) has the same gap (`buildBenchWorld` at `gameStartDate()`, no wait), which #8580 (item `tests-door-pledge-weighted-record-by-draw`, in-pr) fixes by waiting weekly; main still fails it on this seed until that merges.

**Fix.** In `filedRace`, call `advanceToFilingOpen(core)` after `openParties` and before `openContests`, so each drawn place is read on the first day a window opens; keep the 12 draws from all 56 places, keep every assertion, and keep naming each place passed over (add the place's reason when a window opens after the election or no contest opens at all). Where fewer than 3 places qualify, fail by name as now. If the weighted test is still red on this seed after #8580 merges, give it the same call instead of its own weekly loop. Never pin a place or seed, never lower the 3.

**Time box.** 1.5 hours.

**Rules.** One rule, all 56 places: a test that needs a case draws until it finds one, from all 56, and names each place and seed (`drawn-place-tests`). No dice.

**Done when.** A second session runs `src/core2/door-pledge.test.ts` with `GOLDEN_PATH_SEED=f26db0f13c6bffec4a68430111c0bdb5` and on three fresh seeds and sees every test pass, the PLEDGE TURNOUT line naming three drawn places (with the places passed over and why), and the same file fail by name when fewer than three qualify.

**Waits on.** Nothing.

**Files.** src/core2/door-pledge.test.ts, src/core2/gov-test-clock.ts

**Notes.** Reproduced Nov 12 17:38Z on a sparse copy of main: `GOLDEN_PATH_SEED=f26db0f13c6bffec4a68430111c0bdb5 npx vitest run src/core2/door-pledge.test.ts -t "pledged as a group" --maxWorkers=1` exit 1, 91 s, failure at :480 with the twelve lines above. Twin searched: `campaign-door-pledge-turnout-total` (done, the band check this test makes), `tests-door-pledge-weighted-record-by-draw` (in-pr, #8580, the weighted test; evidence added in its Cause).

Dropped Nov 13, 2026 (Account lead T33, CTO's Nov 12 drop rule): fixed already, and it names no player screen (its Seen line says "no player screen"). On the train (c39bbb71), src/core2/door-pledge.test.ts calls `advanceToFilingOpen(core)` after `openParties` (line 107), the fix this item asked for, and `GOLDEN_PATH_SEED=f26db0f13c6bffec4a68430111c0bdb5 npx vitest run src/core2/door-pledge.test.ts --maxWorkers=1` passes 7 of 7 in 172 s, with the PLEDGE TURNOUT line naming its drawn places.
