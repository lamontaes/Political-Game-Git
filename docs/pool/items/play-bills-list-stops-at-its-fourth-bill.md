---
id: play-bills-list-stops-at-its-fourth-bill
title: "The Bills list is cut off at its fourth bill while the sheet has free room below it"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: the Replay's check of merged main d679d71c, Nov 24 (comment 7124463870 on #10377)
claimed-at:
after:
lead: play-first
model: sonnet
effort: low
root: none
---

**What.** On Politics, Bills the list of bills ends at its fourth bill, with the next bill cut through, while the sheet below the list is empty. The owner ruled on Nov 23: "none of these scrollers, especially when there's ample dead space in these menus". The Replay saw the list stop with free room under it on merged main. Seen: the Bills list at 1440x900 fills the sheet down to its foot, and scrolls inside itself only when there are more bills than fit.

**Cause.** Measured: at Wayland, Michigan, seed 08e41f00-0d73-4ee9-a697-c30c8fc5b526, 1440x900, the Bills list's `nav.pick-list.roster` is capped at 414 pixels (46% of the window, `.pick-list` in src/bench/play.css) with `overflow-y: auto` around the pager's own box, which is 502 pixels, so the list shows four bills in a 695 pixel sheet body. The ui-look guard did not list it because the panel was already at its full height (850 of 850) and guard B tests the panel's height, not the room left inside a full panel. `rosterScreen` (src/bench/ui/roster-screen.mjs) sizes the pager from `viewHeight() - 330`, which leaves the Bills list about 100 pixels short of the sheet's foot.

**Fix.** In src/bench/play.css lift the nav's cap for `.roster-screen.bills` (the same rule patch notes has: `max-height: none`, `overflow: visible`) so the pager's box is the list's one scroll. `rosterScreen` takes a `reserve` (default 330) and the Bills screen in src/bench/play.mjs passes `maxRows: 20` and `reserve: 240`, so the pager starts at the most rows the sheet allows and `fitPagers` gives back rows until the sheet fits.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** This is a game, not a spreadsheet: a list uses the room the sheet has and scrolls only when its bills do not fit. Replace, never layer: the nav's cap is lifted for the Bills list, not hidden by a second box.

**Done when.** A second session starts the bench on main in a drawn place (named with its seed), opens Politics and Bills at 1440x900 in a world with at least six bills and sees the list reach near the sheet's foot with no empty room under it, scrolling inside its one box only when more bills remain; `npm run ui-look` passes.

**Waits on.** Nothing.

**Files.** src/bench/play.css, src/bench/play.mjs, src/bench/ui/roster-screen.mjs

**Notes.** Filed by Box and scroll (lane 2), Nov 24. Open for the CTO: the guard misses a list that stops short inside a full panel; extending guard B to "a scroller whose bottom is 48 pixels or more above the panel's content foot" would flag other lists (Elections, Issues, the Guide) and grow the baseline, which needs his line.
