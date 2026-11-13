---
id: play-election-night-133-presses
title: "Election night for a statewide race is one press of Next returns per county or city, 133 in Virginia, with no other way to the call (Abbs Valley, Virginia)"
area: play
kind: bug
priority: 2
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
source: Playtester P2, Nov 13 (Abbs Valley, Virginia, seed 62d329e8-11c0-4bd8-b757-240446436fb0)
---

**What.** On main 596d5127, an Advanced start in Abbs Valley, Virginia (seed 62d329e8-11c0-4bd8-b757-240446436fb0) as Commissioner Beth Hall, played by Week to election day, Tuesday, November 4, 2025. She voted in the governor's race, and on the morning of November 5 the returns panel opened: "Governor / The count / Timothy McKay 428 votes / Susan Lucas 590 votes / Crystal Dominguez 0 votes / The call / Galax city is in. Susan Lucas leads there, 134 to 75. With 6 of 133 places in, Susan Lucas leads by 162." The only control is Next returns, and each press adds one more county or city, so reaching the call takes 133 presses. The panel covers the clock until then. Seen: election night for any race reaches its call in a handful of presses, and a player can always get to the call.

**Cause.** Found in code: `src/bench/election-night.ts` (around line 300 to 350) turns the count's reports (`returnsOf(api, race.contestId).reports`) into one step per reporting place. `electionNight` in `src/bench/play.mjs` (line 1249) steps through them one press at a time and closes only on the last step. A town race has one to a few places; a statewide race has every county and independent city.

**Fix.** `election-night.ts` folds the places that report into steps by the share of the count they bring in: a step closes when the running count has risen by a share set in a new TUNABLE parameter (with the spread it is checked against), and names the biggest place in it and how many reported. A town race with a few places keeps one step each. The call stays the last step. Test: a drawn statewide race's night has at most a dozen steps, and its last step's totals equal the count's totals.

**Time box.** 2 hours

**Rules.** Sliding scales and causes: steps close on the share of the count that came in, not on a fixed number of places. No hand-written player text: the step's line comes from the election-day bank, as the place lines do now.

**Done when.** The new test passes in two drawn places, and a second session sees, on the bench on main, a drawn life that votes in a statewide race reach the call on election night in a dozen presses or fewer (screenshot of the call with the place and seed).

**Waits on.** Nothing.

**Files.** src/bench/election-night.ts, src/bench/play.mjs (read only)

**Notes.** The same night had "Crystal Dominguez 0 votes" after six places: see elections-candidate-draws-zero-votes-diaz.
