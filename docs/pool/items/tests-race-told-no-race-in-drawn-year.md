---
id: tests-race-told-no-race-in-drawn-year
title: "The race-told scene test looks for a race to enter on the 18th birthday only, so its filed draws find none and the test runs out of places"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: fix/race-told-seed
pr: 8899
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Story session, Nov 10, PR #8149's unit check; red on clean main at seed 409bddfc193b4c846dc319e3c885512097206472; reported again Nov 12 at a seed starting 9c3cacbc
checked:
claimed-at:
---

**What.** `src/director/race-told-scene.test.ts` fails on clean main by the luck of the draw: "no drawn place had a race told in the year". Half its draws file the new adult for a race, and those draws keep coming back "no race to enter that year". Guards: the scene in which someone the player knows tells them who won the race, the day after the count.

**Cause.** Found in code: `src/director/race-told-scene.test.ts`, `fileNewAdult`, read `playerContests` once, on the 18th birthday. `playerContests` (`src/core2/modules/elections.ts`, `openContests`) lists only races whose filing is open that day, and since Nov 4 every race opens its filing on its own day, so on the birthday most places have none open (the first trap in `drawn-place-tests`). Measured on clean main 33e38d44bc at seed fb5bf751f7435582330df7796b641ff3b2964987: Malaeloa/Ituau, American Samoa and Fairfield, Maine, both filed draws, came back "no race to enter that year"; Wynnburg, Tennessee (unfiled) had no race told.

**Fix.** `fileNewAdult` waits a week at a time, up to 60 weeks, as `src/bench/election-day.test.ts` does, until a race held inside the year played from that day takes the filing, then gathers signatures as before. It names what it passed over: each refused race with its rule, the date reached, or the petition that fell short. No assertion changes, no place or seed is pinned.

**Time box.** 1 hour.

**Rules.** One rule, all 56 places: the test draws from all 56 and names every place passed over. Wire to the world: the scene is cast from the election engine's own count record.

**Done when.** A second session runs `src/director/race-told-scene.test.ts` on main with `--maxWorkers=1` on three fresh seeds and at seed 409bddfc193b4c846dc319e3c885512097206472, each passing with its `RACE TOLD` line naming the drawn place, the seed and the count's record id; and, in the running game in a drawn place, plays a new adult through a race's count and sees the race-told scene the day after.

**Waits on.** Nothing.

**Files.** src/director/race-told-scene.test.ts

**Notes.** Nov 10, 15:25 UTC (Story): red again on CI at seed 13185266f8e7978e6bec3346aacf921bab78efe0, same message (Little Rock, South Carolina, no race to enter that year; Old Agency, Montana, no race told in the year; and the rest of its draw), so it fails on more than one seed; seed 11 passes. Nov 12 (fixer): the 9c3cacbc seed's full value was not in any log I could read; reproduced the cause on fresh draws instead. Two runs on this machine were killed for memory by the shared bash memory group ("Worker exited unexpectedly", `dmesg` oom-kill), which is not a test result.
