---
id: clock-check-reads-hidden-clock
title: "clock.browser.mjs reads the card's clock while the campaign trail hides it, and crashes"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: haiku
effort: low
root: none
source: written by hand for the hour's pool notes (opus-d23b, Nov 11, the play-stop-07 replay)
checked:
---

**What.** `node src/bench/clock.browser.mjs` on main e0428fdc9ae in Point Venture, Texas (game seed 4f7baac5-4830-4738-83a4-a3a4d179b1b4) logged "Outing: 3 hours | -> Wednesday, October 15, 2025 10:00 AM" with an empty clock before the outing, then crashed with "TypeError: object null is not iterable" in `minutes()` at line 24. The game was right (the engine's packet said 3 hours, ending at 10:00 AM); the check could not read it. Guards: Day landing on a morning and an outing moving the card's clock by its hours.

**Cause.** Found in code: `clock()` in src/bench/clock.browser.mjs (line 19) reads `#card-clock` with `innerText`, which is empty while the campaign trail sheet hides the card, and `before` is read with the trail open (line 149), so `minutes(before)` gets an empty string.

**Fix.** Read the clock with `textContent` in `clock()`, which keeps its regex spacing fix. With that one change the check passed in Crestone, Colorado (seed 79ddf9db-14fb-42d7-84aa-10dd404d16dc): 7:00 AM to 10:00 AM for a 3-hour outing.

**Time box.** 1 hour for one Haiku session.

**Rules.** Ask why: the check reads the record the player sees, not a hidden copy, and names the place and seed. One rule, all 56 places: the check runs in a place drawn from all 56.

**Done when.** `node src/bench/clock.browser.mjs` passes on two drawn places in a test run against the bench on main, each printing its seed, place and the outing's before and after clocks; with `innerText` put back it fails on a draw whose outing reads the clock under the trail sheet. A second session runs the check against the bench on main in a drawn place and sees it pass with the before and after clocks printed, matching the clock on the card in its screenshot.

**Waits on.** Nothing.

**Files.** src/bench/clock.browser.mjs

**Notes.** Found by opus-d23b replaying play-stop-07-every-day-starts-at-midnight (seen and done on Nov 11).
