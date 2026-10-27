---
id: words-day-end-scene-opens-next-midnight
title: "A scene from a record made during the day opens at the next midnight, so the clock and the narration disagree"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When a record that stops the player's day is made during that day, the story director's stop lands at the next midnight, not at the hour of the record. In the bench, the We the People chair asked the player to run on Saturday, January 3, 2026, and the scene opened on the second Day click with the clock at Sunday, January 4, 12:00 AM and a night window, while its narration said "It's a Saturday in January." The director rates the player's moment when its record is made only when the player's clock frontier is on the core's date (rateNow in src/director/ledger.ts), and otherwise the day-end measure registers the stop at the next midnight. Seen in White Sulphur Springs, Montana (3080050), place seed e6253d7d132141ef79226210a85a474e90a1d2bb2d5ea41a69c63b9bfdb96035, moment person_f20a24acaa8c0691:2026-01-03:party-asked:contest:seat:US-MT:lower:078:0:2026-11-03:party:US-MT:we-the-people:person_f20a24acaa8c0691.

**Rules.** Ask why: the stop's time comes from the record's own date and the player's clock, by record, never a fixed hour. One rule, all 56 places: the same timing applies to every scene that stops the day. No hand-written player text: the narration's day stays the record's day.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a record that stops the player's day and is made during that day opens its scene on that day, with the bench clock showing that day, on the first Day click that plays it; a bench screenshot at 1440x900 with the place and seed under it shows the clock and the narration on the same day, and a test fails if the stop lands on the next day.

**Files.** src/director/ledger.ts, src/bench/player.ts

**Notes.** TODO Playtest Oct 26 sitting 1 (installed v0.34.0): The filing-reaction scene opened Wed Jan 22, 12:00 AM saying "It is a Monday in January."

Oct 27 (director lead): reproduces on clean main at 820801c06 in `src/director/played-talks.test.ts` with GOLDEN_PATH_SEED=102b8c4d5f1ea00d (Gray Court, South Carolina): the appointment talk for moment `person_d8e14eeb5bd8ca2b:2025-01-20:appointed:appointment:town:finance-director:2025-01-20` reports "opened on 2025-01-21, staged for 2025-01-20". The director lead owns `src/director/scheduling.ts` now and takes this after `director-scenes-from-circumstance`.

Oct 27, 11:05 UTC (director lead), root cause measured: the core writes a day's records after the player clock has already passed that day's midnight. In a played run on branch claude/director-scenes-from-circumstance (Wiscon, Florida, seed director-circ-1, 200 days through the player clock), all 371 records that could call a scene from circumstance were written with the player's frontier at the next day, 00:00. A stop may not be set before the frontier (`registerModuleStopV1`, src/core2/player-stops-v1.ts:276). So no director change can open such a scene on its record's own day, and the item's rule forbids a fixed hour. Two ways forward, both outside the director: the core runs the world's day before the player walks it (core2, lead m0-m2), or the stop lands at the player's next waking moment once `play-stop-07-every-day-starts-at-midnight-a` defines when the player's day begins (lane). Either way the narration must name the day the scene plays. The director side is ready to read whichever lands.
