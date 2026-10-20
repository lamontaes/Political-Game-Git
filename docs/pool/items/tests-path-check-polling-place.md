---
id: tests-path-check-polling-place
title: "path-check.ts stops at the polling place: advance refuses until the character votes or leaves"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4876
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/bench/path-check.ts` (the headless golden path) crashed on election day: the character is held at the polling place and `BenchPlayer.advance` refuses with "Vote or leave the polling place first", which the script never answered. After that, a resident who holds a seat in a body with no regular meeting (a federal chamber) could not draft a bill: `seatAct` placed the bill on an agenda and `placeOnAgenda` threw "has no regular meeting", which would stop the game for a player who is a senator. The script now has the character leave the polls, picks a resident officeholder on a body that meets (a council) before one in a federal chamber, and `seatAct` keeps such a bill drafted with no agenda date.

**Rules.** Replace, never layer: the guard is in the one place the agenda is placed, not a second path. One rule, all 56 places: the check draws a place and names it. No dice: the bill stays drafted because the body has no meeting, not by a chance.

**Done when.** `GOLDEN_PATH_SEED=pc-a node --import tsx src/bench/path-check.ts` prints a furthest step instead of throwing, and a test in src/bench (seat-no-meeting.test.ts) drafts a bill as a member of a body with no regular meeting in a drawn place and finds it drafted with no agenda date; the test fails without the fix.

**Files.** src/bench/path-check.ts, src/bench/legislature.ts, src/bench/seat-no-meeting.test.ts

**Notes.** Found Oct 17 running path-check on seeds pc-a and pc-b; the polls error appeared on both. With a body that meets chosen, Coplay, Pennsylvania (seed pc-c) reaches step 9 (a council bill, 1 to 4, failed); with only a federal chamber, as in Pennsville, New Jersey (pc-a), the senator's bill stays drafted and the check stops at step 6, because the federal floor calendar is not driven. The check also walked into the filing office two days before the player's 18th birthday, so no contest was open to them; it now lives to the day after the birthday first, and Coplay reaches step 9 with the player's own filing (Council member, on the ballot), 40 doors knocked (15 reached), election night and the council vote.
