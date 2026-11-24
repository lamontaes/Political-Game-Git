---
id: play-day-lands-at-midnight
title: "Day lands on midnight and an outing never moves the clock"
area: play
kind: bug
priority: 1
size: S
status: dropped
claimed-by:
pr: #6059
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On main, pressing Day on the bench lands the player's clock on midnight. From the opening it can skip a whole day: in Newton Grove, North Carolina, the first Day went from January 20 to January 22, 2025 at 12:00 AM. A campaign outing such as knocking on doors records its hours but never moves the clock the card shows. Cause: BenchPlayer.advance in src/bench/player.ts builds the destination at the same minute plus a day, from a clock the core rests at midnight. The campaign-day route in src/bench/handler.ts never moves the player clock. This is the clock half of play-stop-07, checkable on the bench.

**Rules.** Sliding scales and causes: the day starts at a parameter (TUNABLE, with its spread), not a hard-coded hour. Speed: no year more than 20 percent slower.

**Done when.** src/bench/clock.browser.mjs passes in a drawn place (Day twice lands on two mornings a day apart; a canvass moves the card's clock by its hours) with the place and seed named, fails on main, and src/bench/player-day-morning.test.ts passes.

**Files.** src/bench/player.ts, src/bench/handler.ts, src/bench/play.mjs, src/core2/data/parameters.json

**Notes.** TODO

Sent back 2026-10-26 from PR #6059 (branch claude/quirky-ride-vrwwz4-play-stop-07): Clock checks pass, but native Cacao PR filing-story state at 1440x900 shows the player card obscuring reply controls; fix play-story-replies-covered-by-player-card and verify every visible response with pointer and keyboard at both sizes before visual acceptance.; finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #6059 (branch claude/quirky-ride-vrwwz4-play-stop-07): The overlap is fixed, but Mark gap and Say nothing remain visibly enabled and inert in the real held filing story with both pointer and Enter (zero requests, unchanged state); play.mjs handlers return when talk is unset, while clock.browser.mjs only Tab-walks those controls, so the every-response activation acceptance is unmet; finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `integration-day-lands-on-morning-and-places-keep-hours`; close into it and carry any line it lacks there.
