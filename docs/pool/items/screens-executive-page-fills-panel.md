---
id: screens-executive-page-fills-panel
title: "A town with only a mayor shows its calendar on the right of the Executive page, not an empty half"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** The CTO, Nov 24 (comment 7131781243), caught that the Town of Alderson's Executive page has an empty right half with only the mayor on it. A town with no other officers to list has no right column, so the one column ran the whole width and its content sat in the left part.
Seen: Politics, Local, Executive in a town with only a mayor, at 1440 by 900. Seen: the same page with the calendar in the right column, after. Guards: executive-fits.browser.mjs

**Cause.** Measured: `node src/bench/executive-fits.browser.mjs` against `npm run bench` on main fails "Tatgua, Northern Mariana Islands: the executive page has no right column" on a drawn place. executiveView in src/bench/play.mjs puts the coming-up section under the chief and the other officers on the right; with no other officers the right column is empty and the screen draws single.

**Fix.** In executiveView, when there are no other officers, put the coming-up section in the right column and not under the chief; add executive-fits.browser.mjs.

**Time box.** 1 hours

**Rules.** Screen to mock: MENU-LOOK says no dead space, so the page fills its panel and nothing is empty beside the mayor. No hand-written player text: no label is added; the same coming-up section only moves.

**Done when.** A second session, in a drawn place and seed it names, opens Politics, Local, Executive in a town with only a mayor and sees the calendar in the right column; executive-fits.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.mjs,src/bench/executive-fits.browser.mjs (new)
