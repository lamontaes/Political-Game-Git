---
id: play-stop-19-turning-eighteen-and-journal-silent-a
title: "Your own 18th birthday is on the calendar and the day is marked on screen"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #6398
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** I started at 17 with a February 3 birthday on the v0.22.10 release. Coming up listed three family birthdays and not mine, and pressing Week across February 3 showed nothing. Turning 18 is golden-path step 1. This part puts the player's own birthday under Coming up and marks the day on screen.

**Rules.** Serves LAW.md §5, Journal and the past; LAW.md §9, Time. This is a game, not a spreadsheet: turning 18 is golden-path step 1 and the player sees it the day it happens. No hand-written player text: the moment's words come from the director and the English engine.

**Done when.** In a drawn place, a life started at 17 lists its own 18th birthday under Coming up, and advancing across that day stops on a moment or a journal toast that names it, shown by a screenshot.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Coming up lists your own 18th birthday, and on the day the game marks it on screen (you can vote and run now).

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/calendar.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-19-turning-eighteen-and-journal-silent (Oct 24, lane; the work order's calendar half). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

Merger 0: Sent back 2026-10-26 from PR #6108 (branch play-first/play-stop-19-turning-eighteen-and-journal-silent-a): main merge conflicts in data/english/parts/journal.json, src/director/data/journal-rows.json, and src/director/journal.ts; aborted without hand-merging banks or code; finish on that branch, merge main into it first.

Fixer 6 (Oct 27): superseded by PR #6398 (the January 21 first-day birthday stop fixed on #6108's head, main merged).
