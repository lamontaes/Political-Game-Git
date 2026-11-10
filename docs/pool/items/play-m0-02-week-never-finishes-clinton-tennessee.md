---
id: play-m0-02-week-never-finishes-clinton-tennessee
title: "Red on main by draw: the golden path's accepted step M0-02 stops with 'The week did not finish.' in Clinton, Tennessee"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: play-first
source: Fable, Nov 10, 2026, from the golden-path check on pull request 8117 (head 63eb7cf306), replayed on clean main
---

**What.** The golden path's step M0-02 (src/bench/m0-check.ts: a chosen adult is played for a week; every act is the character's own pick or answers a stop) fails on clean main at 550ed6ad69 in Clinton, Tennessee: 'Error: The week did not finish.' The step advances a week and answers each stop; its guard gives up after 5,000 answers without the week completing. Replay: GOLDEN_PATH_SEED=b5d81e3e204b0f35f6c6903c19ba622965cffb498c39f30de1c2961a4df340b0 GOLDEN_PATH_PLACE_KEY=4715580 node --import tsx src/bench/m0-check.ts M0-02. It fails the same way on the words machine's branch, which changes nothing in the player's week. The runner draws each step's place from the commit, so any pull request can draw this place and go red on an accepted step.

**Rules.** Red main comes first (owner, Oct 15). One rule, all 56 places: the step must pass in any drawn place. Never raise the guard to get green: find what keeps stopping the week (which stop repeats, and for whom) and fix that.

**Done when.** The replay command above passes on main, and the pull request names the stop that repeated and why. A second session starts a new game in Clinton, Tennessee with that seed in the running game, picks an adult and presses Week: the week ends, with a screenshot of the day it lands on.

**Files.** src/bench/m0-check.ts, src/bench/player.ts

**Notes.** Not looked into: which stop repeats. The check's own adult is chosen by adultOf(w, 'm0-02').
