---
id: screens-government-to-mock
title: "Government follows its approved mocks: title and tabs on one row, the room as a strip"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by: screens lane (Nov 17)
pr:
blocked-on:
source: crew line item 4, the remaining approved mocks
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** Politics > Government differed from its approved mocks in two ways. The sheet's title stood on its own row above the tabs, and the room's painting was a tall picture in the left column only. The mocks put the tabs beside the title and the room as a short strip across the screen.
Seen: Politics > Government at every level, beside the gov-local, gov-state and gov-federal mocks.

**Cause.** Found in code: `src/bench/play.css` line 3604, the `.chamber` rule, drew the room 152 pixels tall inside the main column of `splitScreen` (`src/bench/ui/split-screen.mjs`), and `panelHead` in `src/bench/ui/panel.mjs` left the sheet's tabs on a row of their own.

**Fix.** Give `splitScreen` a header slot across both columns and pass Government's room there as a short strip; put the sheet's tabs in its head row beside the title, below it only when they do not fit. The player sees it on every Politics and You sheet, and on Government.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the tall room in the main column and the separate tab row go in the same change. One rule, all 56 places: the head row and the strip are one rule for every sheet and every level.

**Done when.** A second session opens Politics > Government in a drawn place and, at Local, State and Federal, sees the tabs beside the title and the room as a short strip across the screen above both columns.

**Waits on.** Nothing.

**Files.** src/bench/play.css, src/bench/play.mjs, src/bench/ui/split-screen.mjs, src/bench/government-head.browser.mjs

**Notes.** Crew line #9747, item 4. The leader's background line and "What she wants" in the mocks need records the game does not keep yet.
