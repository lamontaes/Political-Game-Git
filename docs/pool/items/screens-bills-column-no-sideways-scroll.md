---
id: screens-bills-column-no-sideways-scroll
title: "A long name on a bill's page wraps in its column instead of scrolling it sideways"
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

**What.** The `ui-look` guard flagged `politics > Bills [sheet] . div.mx3col scrolls` (axis x) on #10534's run at Faga'itua, American Samoa (seed 6502c908-0bfa-4af5-9109-4169651be082), intermittent: a second scan at the same seed found the column fitting (280 of 280). A column of a bill's page scrolled sideways when a row held a word wider than the column.
Seen: Politics, Bills with a long name in a row, at 1440 by 900. Seen: the same page with the name wrapped, after. Guards: bills-column-width.browser.mjs

**Cause.** Measured: `node src/bench/bills-column-width.browser.mjs` against `npm run bench` on main fails "column 1 of the Bills page scrolls 315px sideways" (Lewisville, Idaho). The bill page's columns (`.bill-board > .board-cols > .mx3col` in src/bench/play.css) set `overflow-y: auto`, which makes the sideways axis scroll too, and a typed row's figure (`.strip-screen .dotrow.typed .dotvalue`) is `white-space: nowrap`, so a long name or title as a row's figure is wider than the 280 pixel column.

**Fix.** On the bill page, the columns hide sideways overflow and wrap long words, and a typed row's figure shrinks to its row and wraps; add bills-column-width.browser.mjs.

**Time box.** 1 hours

**Rules.** Screen to mock: MENU-LOOK says no scrollers where there is room, and a column scrolls down and never across. No hand-written player text: no label is added; only wrapping changes.

**Done when.** A second session, in a drawn place and seed it names, opens Politics, Bills and sees no column scroll sideways; bills-column-width.browser.mjs passes and the `ui-look` guard no longer flags a sideways scroll on the Bills page.

**Waits on.** Nothing

**Files.** src/bench/play.css,src/bench/bills-column-width.browser.mjs (new)
