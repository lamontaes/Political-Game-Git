---
id: play-stop-19-turning-eighteen-and-journal-silent-a
title: "Your own 18th birthday is on the calendar and the day is marked on screen"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** I started at 17 with a February 3 birthday on the v0.22.10 release. Coming up listed three family birthdays and not mine, and pressing Week across February 3 showed nothing. Turning 18 is golden-path step 1. This part puts the player's own birthday under Coming up and marks the day on screen.

**Rules.** This is a game, not a spreadsheet: turning 18 is golden-path step 1 and the player sees it the day it happens. No hand-written player text: the moment's words come from the director and the English engine.

**Done when.** In a drawn place, a life started at 17 lists its own 18th birthday under Coming up, and advancing across that day stops on a moment or a journal toast that names it, shown by a screenshot.

**Files.** src/bench/calendar.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-19-turning-eighteen-and-journal-silent (Oct 24, lane; the work order's calendar half). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
