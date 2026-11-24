---
id: play-patch-notes-cover-the-title-menu
title: "The patch notes panel overlaps the title menu and cuts off Continue as ..."
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: the CTO's review of Nov 24, send-back 3 (comment 7125269509 on #10377)
claimed-at:
after:
lead: play-first
model: sonnet
effort: low
root: none
---

**What.** Patch notes opened from the title menu centered itself on the screen and covered the right part of the title menu, so the line "Continue as ..." was cut off at the panel's edge. The CTO's review of Nov 24 sent it back: "The patch notes panel overlaps the title menu and cuts 'Continue as ...'." The panel has to sit beside the menu, not over it. Seen: Patch notes from the title at 1440x900, 1280x720 and 1920x1080 sits to the right of the title menu with the whole "Continue as" line showing.

**Cause.** Measured: with a probe that opens Patch notes from the title at three window sizes (no place or seed exists before a life is drawn; command: `node` with Playwright on the bench at `localhost:3000/play`, click `#front-patch-notes`, read the two rects), at 1440x900 the title menu (`#front`) spans x 56 to 456, and a sheet opened from the title takes `options-sheet`, which sets `left: 50%` with `translateX(-50%)` and a 760 pixel width (src/bench/play.css, `#game:not(.in-play) #sheet`), so the patch notes panel spans x 340 to 1100, 116 pixels over the menu; at 1280x720 it overlaps by 196 pixels. Nothing in `openSheet` (src/bench/play.mjs) knows where the title menu ends.

**Fix.** In `openSheet` (src/bench/play.mjs), when the tab is the patch notes and the title menu is showing, set the sheet's width and left from the room to the right of the title menu's edge (`#front` right plus 16 pixels, up to the window's right gutter), centered in that room; any other sheet clears the two styles. The menu's edge is read from the page, so it holds at every window size and UI scale.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** This is a game, not a spreadsheet: a panel never covers the menu it was opened from. Replace, never layer: the sheet's own centering is replaced for this screen by the measured placement, not hidden behind a second panel.

**Done when.** A second session starts the bench on main (the title, before any life is drawn: no place or seed exists there), opens Patch notes at 1440x900 and at 1280x720, and sees, in a screenshot at each size, the whole "Continue as ..." line, "New game", "Saved games", "Options" and "Patch notes" with the panel to their right and not touching them.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs

**Notes.** Filed by Box and scroll (lane 2), Nov 24. The same review says the notes still scroll twice (the builds list and the notes) and that long lists page with arrows; MENU-LOOK as written says no arrows and no "1 of N" (Nov 8), so that part waits on the CTO's answer on #10377.
