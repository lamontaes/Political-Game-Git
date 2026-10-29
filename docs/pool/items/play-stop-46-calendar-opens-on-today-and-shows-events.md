---
id: play-stop-46-calendar-opens-on-today-and-shows-events
title: "The calendar opens on today, marks the days that have something, and shows a day panel only when a day has something"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by: play-first/play-stop-46-calendar-opens-on-today-and-shows-events
pr: #6221
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T05:28:23.047Z
---

**What.** In v0.34.0 the Calendar header reads "February 3, 2025" with the 3 boxed while the player's card says Tuesday, February 4; clicking the empty February 3 opens an empty middle panel; the grid sits left of that empty column, so the whole screen looks off-center in a big black panel; and the family birthdays (February 16, March 11) and the March 11 filing deadline show only in the Coming up list, not on the days. The owner: "you clicked February 3rd. If there's nothing there, the middle panel should not be there. What is wrong with this calendar? How hard is it to make a calendar? Why is it so off-center? And the birthdays and the filing deadline, this is just a blank screen, a black screen. And why is this screen not matte?" This item opens the calendar on today, draws event icons on the days that have events (the Kit 13 calendar art), shows the middle day panel only for a clicked day that has something, and centers the layout.

**Rules.** Serves LAW.md §1, Screens and menus (the calendar is an opaque panel, REG:149; the Oct 14 mock: one month plus Coming up, day tiles with small event icons, a day panel opening between them on click) and LAW.md §9, Time. This is a game, not a spreadsheet. Replace, never layer: the always-open middle column is replaced by one that opens only when a day has something.

**Done when.** In a drawn place at 1440x900 with a birthday and a filing deadline ahead, a check in src/bench/calendar.browser.mjs passes: the Calendar opens with today's tile boxed and the header naming today; clicking an empty day shows no middle panel; clicking a day with a birthday or the deadline shows the panel with the event in words; tiles with events carry the icons from art/ui-kit13/calendar; the panel's left and right padding are equal within 2 px; shown by a screenshot beside docs/ui/mocks/screens-2026-10-14/shots/calendar.png.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The calendar opens on today, birthdays and deadlines show on their days, and a day panel appears only for a day that has something.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/calendar.ts, src/bench/play.mjs, src/bench/play.css, src/bench/calendar.browser.mjs, art/ui-kit13/calendar

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "If there's nothing there, the middle panel should not be there." New owner instruction in playtest; CTO to record in OWNER-DECISIONS.md. The owner's "why is this screen not matte?" is unclear next to REG:149's opaque panel and the mock's gold-edged dark panel over the blurred room; the CTO confirms what he means (flat, non-glossy) before the finish is chosen. The relatives whose birthdays show (Aditi and Wesley Roberts) were never introduced (play-stop-15). Skipping to a future day is play-stop-47. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
Merged Oct 27 in PR #6221; awaiting the owner's installed-build check
