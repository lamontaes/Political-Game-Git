---
id: play-stop-07-every-day-starts-at-midnight-b
title: "The scene's light follows the clock and an office outside its hours is closed"
area: play
kind: bug
priority: 1
size: M
status: dropped
claimed-by:
pr:
blocked-on:
after: play-stop-07-every-day-starts-at-midnight-a
source: added with npm run pool -- add
lead: play-first
milestone: play-first
---

**What.** On the v0.22.10 release the city secretary's counter was open in daylight at midnight on a Sunday, and the door-knocking scene was sunny at 12:00 AM. The scene's picture and the office's hours ignore the clock. This part draws each scene at the hour on the clock and keeps offices to their hours.

**Rules.** Serves LAW.md §9, Time; LAW.md §11, The world on screen makes sense. Sliding scales and causes: an office is open or closed from its hours on record, never by default. This is a game, not a spreadsheet: the picture has to match the time the player sees.

**Done when.** In a drawn place, the scene at 11 PM uses the night picture, and Travel to a filing office outside its hours shows it closed or moves the visit to opening time, shown by a screenshot of each.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The room's light matches the hour on the card, and going to the city secretary at midnight says the office is closed or waits for morning.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/scene.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-07-every-day-starts-at-midnight (Oct 24, lane; the work order's screen half). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Playtest Oct 26 sitting 1 (installed v0.34.0): The county board of elections was open with daylight windows at 8:30 PM; the bedroom was sunlit at midnight; the opening went from night to day in one room.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `integration-day-lands-on-morning-and-places-keep-hours`; close into it and carry any line it lacks there.
