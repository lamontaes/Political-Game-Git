---
id: play-day-lands-at-midnight
title: "Day lands on midnight and an outing never moves the clock"
area: play
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/quirky-ride-vrwwz4-play-stop-07
pr: #6059
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T17:00:30.015Z
---

**What.** On main, pressing Day on the bench lands the player's clock on midnight. From the opening it can skip a whole day: in Newton Grove, North Carolina, the first Day went from January 20 to January 22, 2025 at 12:00 AM. A campaign outing such as knocking on doors records its hours but never moves the clock the card shows. Cause: BenchPlayer.advance in src/bench/player.ts builds the destination at the same minute plus a day, from a clock the core rests at midnight. The campaign-day route in src/bench/handler.ts never moves the player clock. This is the clock half of play-stop-07, checkable on the bench.

**Rules.** Sliding scales and causes: the day starts at a parameter (TUNABLE, with its spread), not a hard-coded hour. Speed: no year more than 20 percent slower.

**Done when.** src/bench/clock.browser.mjs passes in a drawn place (Day twice lands on two mornings a day apart; a canvass moves the card's clock by its hours) with the place and seed named, fails on main, and src/bench/player-day-morning.test.ts passes.

**Files.** src/bench/player.ts, src/bench/handler.ts, src/bench/play.mjs, src/core2/data/parameters.json

**Notes.** TODO
