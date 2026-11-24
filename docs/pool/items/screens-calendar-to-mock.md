---
id: screens-calendar-to-mock
title: "Calendar follows its approved mock: each thing named on its day"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: screens lane (Nov 17)
pr: 9830
blocked-on:
source: crew line item 4, the remaining approved mocks
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** The calendar's month showed only small icons on a day, so the player had to click a day to learn what was on it. The approved mock (`pl-calendar`) and the owner's ruling name each thing on its day: "events on their days, one worded line each naming who and what".
Seen: Calendar on main, beside `docs/mocks/2026-11-08-play/renders/pl-calendar.jpg`.

**Cause.** Found in code: `src/bench/ui/calendar.mjs` line 279, the month's day tile drew one icon per kind of thing and no words.

**Fix.** Each day tile names up to two of its things, the player's own first, each its kind's icon and its own line from the calendar's items, wrapped to two lines; the rest stay on the day's plate. The rows grow to hold them.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the icon-only marks go. No hand-written player text: the lines are the items' own. Screen to mock: shared parts only.

**Done when.** A second session opens the Calendar in a drawn place and reads each thing's line on its day in the month, with nothing in the panel scrolling.

**Waits on.** Nothing.

**Files.** src/bench/ui/calendar.mjs, src/bench/play.css, src/bench/calendar.browser.mjs

**Notes.** Crew line #9747, item 4. The mock's times beside each thing ("11 AM") and its Tomorrow block need a time on the calendar's items, which they do not carry yet.
