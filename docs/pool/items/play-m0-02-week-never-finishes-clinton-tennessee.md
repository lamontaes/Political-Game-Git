---
id: play-m0-02-week-never-finishes-clinton-tennessee
title: "Red on main by draw: the golden path's accepted step M0-02 stops with 'The week did not finish.' in Clinton, Tennessee"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
lead: play-first
source: Fable, Nov 10, 2026, from the golden-path check on pull request 8117 (head 63eb7cf306), replayed on clean main
after:
model: opus
effort: high
root: rc2-done-from-records
---

**What.** The golden path's step M0-02 (a chosen adult is played for a week; every act is the character's own pick or answers a stop) fails on clean main at 550ed6ad69 in Clinton, Tennessee with 'Error: The week did not finish.' The step advances a week and answers each stop; its guard gives up after 5,000 answers without the week completing. It fails the same way on the words machine's branch, which changes nothing in the player's week. The runner draws each step's place from the commit, so any pull request can draw this place and go red on an accepted step. Which stop repeats, and for whom, is not found.

**Cause.** Measured: GOLDEN_PATH_SEED=b5d81e3e204b0f35f6c6903c19ba622965cffb498c39f30de1c2961a4df340b0 GOLDEN_PATH_PLACE_KEY=4715580 node --import tsx src/bench/m0-check.ts M0-02 fails in Clinton, Tennessee at 550ed6ad69 with 'The week did not finish.' (the guard of 5,000 answers at src/bench/m0-check.ts, line 109).

**Fix.** Find which stop repeats and for whom, and fix that in the advance or the talk; do not raise the guard. It is likely the same family as play-calendar-jump-hangs-brookside-2025.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Red main comes first (owner, Oct 15). One rule, all 56 places: the step must pass in any drawn place. Never raise the guard to get green: find what keeps stopping the week (which stop repeats, and for whom) and fix that.

**Done when.** A second session runs the replay command above on main and sees M0-02 pass; the pull request names the stop that repeated and why. The second session also starts a new game in the drawn place Clinton, Tennessee with that seed in the running game, picks an adult and presses Week: the week ends, with a screenshot of the day it lands on.

**Waits on.** Nothing.

**Files.** src/bench/m0-check.ts, src/bench/player.ts, src/bench/handler.ts

**Notes.** Not looked into: which stop repeats. The check's own adult is chosen by adultOf(w, 'm0-02').
