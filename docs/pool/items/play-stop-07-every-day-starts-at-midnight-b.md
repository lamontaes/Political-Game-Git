---
id: play-stop-07-every-day-starts-at-midnight-b
title: "The scene's light follows the clock and an office outside its hours is closed"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: play-stop-07-every-day-starts-at-midnight-a
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release the city secretary's counter was open in daylight at midnight on a Sunday, and the door-knocking scene was sunny at 12:00 AM. The scene's picture and the office's hours ignore the clock. This part draws each scene at the hour on the clock and keeps offices to their hours.

**Rules.** Sliding scales and causes: an office is open or closed from its hours on record, never by default. This is a game, not a spreadsheet: the picture has to match the time the player sees.

**Done when.** In a drawn place, the scene at 11 PM uses the night picture, and Travel to a filing office outside its hours shows it closed or moves the visit to opening time, shown by a screenshot of each.

**Files.** src/bench/scene.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-07-every-day-starts-at-midnight (Oct 24, lane; the work order's screen half). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
