---
id: play-stop-07-every-day-starts-at-midnight
title: "Day jumps to the next midnight, skips whole days, and the clock never shows daytime"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release, pressing Day on Monday January 20 at 8:30 PM went to Wednesday January 22 at 12:00 AM, so Tuesday never happened on screen. Every later Day and Week press also lands at 12:00 AM, alone in the bedroom, for 21 weeks of play. Knock on doors says "3 hours" but the clock stays at 12:00 AM while the scene is a sunny afternoon. Travel to the city secretary at midnight on a Sunday opens the office in daylight. I expected days to start in the morning, to see school or work, and the clock to move with what I do.

**Rules.** This is a game, not a spreadsheet: the player has to see days happen, not just midnight dates. Sliding scales and causes: an office is open or closed from its hours, and an action that takes 3 hours spends 3 hours of the clock.

**Done when.** The owner does the same steps on the next build and is not stopped: pressing Day from any evening lands on the next morning, a 3-hour campaign action moves the clock by 3 hours, and travel to an office outside its hours waits for it to open or says it is closed. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/core2/player-v1.ts, src/bench/handler.ts, src/bench/play.mjs, src/bench/scene.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:00, 16:01, 16:02, 16:05; screenshots 36, 37, 43, 49. assigned: M0–M2 lead (core clock); Play fixer (screen half) (CTO, Oct 24; play-first order docs/work-orders/play-first-2026-10-24.md).
