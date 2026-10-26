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

**Notes.** TODO
