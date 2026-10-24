---
id: play-stop-07-every-day-starts-at-midnight-a
title: "Day lands on the next morning and a 3-hour act spends 3 hours of the clock"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release Day went from Monday 8:30 PM to Wednesday 12:00 AM, skipping Tuesday, and every later Day and Week landed at midnight. Knock on doors said 3 hours but the clock did not move. This part makes an advance land on the next morning and makes an act spend its hours on the player's clock.

**Rules.** Sliding scales and causes: the clock moves by what the player does, so an act that takes 3 hours spends 3 hours. This is a game, not a spreadsheet: the player has to see days happen, not midnights.

**Done when.** In a drawn place, Day pressed at 8:30 PM lands the next morning, Week lands on a morning seven days on, and a 3-hour act moves the clock 3 hours, checked by a test on the player's clock.

**Files.** src/core2/player-v1.ts, src/bench/handler.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-07-every-day-starts-at-midnight (Oct 24, lane; the work order's clock half). `advancePlayerV1` lands every advance at minute 0 of the next day. The clock is the M0-M2 lead's engine file (`needs-from: m0-m2` if the lane cannot change it inside the item's Files). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
