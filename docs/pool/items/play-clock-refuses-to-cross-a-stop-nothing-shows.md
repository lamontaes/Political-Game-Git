---
id: play-clock-refuses-to-cross-a-stop-nothing-shows
title: "The clock refuses Hour, Day and Week on Oct 27, 2026 with no stop on screen (Hampstead, Maryland, a U.S. House candidate)"
area: play
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: found by fixer F6 running src/bench/polling.browser.mjs (Nov 14)
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** On the bench, seed 39ec0fdc-2c02-4e33-a7b7-e193551af953 (the check's pinned run seed; place Hampstead, Maryland, key 2436500), the player files for the U.S. House race on the ballot of Nov 3, 2026, the world runs 304 days (`POST /api/dev/run-until`) to Tuesday, Oct 27, 2026 8:30 PM, and from then on every clock button fails: Hour answers `/api/wait` 400, Day and Week answer `/api/advance` 400, and the screen shows only the room, the buttons and the line "Player stop clock cannot cross an unresolved stop." No talk, no sheet and no Continue is open (a screenshot is in the thread's files). A player cannot get past it: the clock stays at 8:30 PM on Oct 27 through 100 attempts.

**Cause.** Found in code: the refusal is thrown at `src/core2/player-stops-v1.ts` lines 494 and 527 (`bindModuleStopClockV1` and its `setFrontier`) when the earliest registered stop for the player is earlier than the moment asked for. Stops are registered by `src/director/ledger.ts` `registerInterrupts` (line 1658, an interrupt at or over the director's impact line) and by modules through `registerStop` in `src/core2/module-calendar.ts` (line 197). Which one registered the stop here, and why no screen opens it, was not traced: the bench has no route that lists the player's registered stops.

**Fix.** Trace the registrant on that seed (list the player's registry rows at Oct 27, 2026), then make the stop open its prompt as a stop does, or release it when nothing can resolve it.

**Time box.** 3 hours to trace.

**Rules.** Nothing may hold the player's clock with no way to resolve it; a stop is a screen the player can answer.

**Done when.** On that seed and place, after the 304-day run, Day and Week move the clock to Nov 3, 2026 and the polling check in `src/bench/polling.browser.mjs` reaches the ballot.

**Waits on.** Nothing.

**Files.** src/core2/player-stops-v1.ts, src/director/ledger.ts, src/core2/module-calendar.ts
