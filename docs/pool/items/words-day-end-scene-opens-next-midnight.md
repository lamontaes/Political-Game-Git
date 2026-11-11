---
id: words-day-end-scene-opens-next-midnight
title: "A scene from a record made during the day opens at the next midnight, so the clock and the narration disagree"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-words-day-end-scene-opens-next-midnight
pr: #8673
after:
blocked-on:
lead: words
model: opus
effort: high
root: rc2-done-from-records
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T06:04:22.599Z
branch: claude/pool-words-day-end-scene-opens-next-midnight
---

**What.** When a record that stops the player's day is made during that day, the story director's stop lands at the next midnight, not at the hour of the record. In the bench, the We the People chair asked the player to run on Saturday, January 3, 2026, and the scene opened on the second Day click with the clock at Sunday, January 4, 12:00 AM and a night window, while its narration said "It's a Saturday in January." The director rates the player's moment when its record is made only when the player's clock frontier is on the core's date (rateNow in src/director/ledger.ts), and otherwise the day-end measure registers the stop at the next midnight. Seen in White Sulphur Springs, Montana (3080050), place seed e6253d7d132141ef79226210a85a474e90a1d2bb2d5ea41a69c63b9bfdb96035, moment person_f20a24acaa8c0691:2026-01-03:party-asked:contest:seat:US-MT:lower:078:0:2026-11-03:party:US-MT:we-the-people:person_f20a24acaa8c0691.

**Cause.** Found in code: src/core2/player-stops-v1.ts registerModuleStopV1 (line 231) refuses a stop before the player's frontier; the core writes a day's records after the player clock has passed that day's midnight (all 371 records in Wiscon, Florida, seed director-circ-1 were written with the frontier at the next day 00:00, per the item's Notes), so rateNow in src/director/ledger.ts (line 1675) can only stage the scene at the next midnight. Seen in White Sulphur Springs, Montana (3080050).

**Fix.** First replay the Notes' case on today's main and write down whether a scene still opens at 12:00 AM. Then land a stop whose record was made during a day at the player's next day start (`dayStartMinute` in src/bench/player.ts), never at midnight, in the bench's drive loop (`driveTo` in src/bench/player.ts) or at registration (`registerModuleStopV1`, src/core2/player-stops-v1.ts), whichever holds for every producer. Make the narration name the day the scene plays and tell the record's own day as past (its weekday or "yesterday"), from the record's date, through the English engine. Do not reorder the core's day.

**Time box.** 6 hours for one Opus session.

**Rules.** Ask why: the stop's time comes from the record's own date and the player's clock, by record, never a fixed hour. One rule, all 56 places: the same timing applies to every scene that stops the day. No hand-written player text: the narration's day stays the record's day.

**Done when.** A second session plays buildBenchWorld in a drawn place and seed it chose (named) and sees a record that stops the player's day, made during a day, open its scene at the player's next day start and never at 12:00 AM, with the bench clock and the narration naming the same day and the record's own day told as past; a bench screenshot at 1440x900 with the place and seed under it shows the clock and the narration together, and a test fails if a stop lands at minute 0 of a day.

**Waits on.** Nothing. The ruling exists: nothing happens at midnight (owner, Oct 27; docs/coordination/OWNER-DECISIONS.md line 535, "Everything is stuck at midnight", and the clock fix that followed), and the player's day starts at the parameter `playerDayStartMinute` (`dayStartMinute` in src/bench/player.ts, line 216, stopgap SG-PLAY-day-start-minute). play-stop-07-every-day-starts-at-midnight is built and open for its second-session check; it is not dropped.

**Files.** src/director/ledger.ts, src/bench/player.ts, src/core2/player-stops-v1.ts

**Notes.** TODO Playtest Oct 26 sitting 1 (installed v0.34.0): The filing-reaction scene opened Wed Jan 22, 12:00 AM saying "It is a Monday in January."

Oct 27 (director lead): reproduces on clean main at 820801c06 in `src/director/played-talks.test.ts` with GOLDEN_PATH_SEED=102b8c4d5f1ea00d (Gray Court, South Carolina): the appointment talk for moment `person_d8e14eeb5bd8ca2b:2025-01-20:appointed:appointment:town:finance-director:2025-01-20` reports "opened on 2025-01-21, staged for 2025-01-20". The director lead owns `src/director/scheduling.ts` now and takes this after `director-scenes-from-circumstance`.

Oct 27, 11:05 UTC (director lead), root cause measured: the core writes a day's records after the player clock has already passed that day's midnight. In a played run on branch claude/director-scenes-from-circumstance (Wiscon, Florida, seed director-circ-1, 200 days through the player clock), all 371 records that could call a scene from circumstance were written with the player's frontier at the next day, 00:00. A stop may not be set before the frontier (`registerModuleStopV1`, src/core2/player-stops-v1.ts:276). So no director change can open such a scene on its record's own day, and the item's rule forbids a fixed hour. Two ways forward, both outside the director: the core runs the world's day before the player walks it (core2, lead m0-m2), or the stop lands at the player's next waking moment once `play-stop-07-every-day-starts-at-midnight-a` defines when the player's day begins (lane). Either way the narration must name the day the scene plays. The director side is ready to read whichever lands.

**Notes (Fable, Nov 10, model).** The sort marked this for a Fable-level model. Read again by Fable: The cause is found; it waits on a short ruling from the CTO on when the player's day begins, then it is a build against that ruling: Opus at high effort.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:04 UTC) on branch claude/pool-words-day-end-scene-opens-next-midnight.
