---
id: play-guide-sheet-scrolls
title: "The Guide sheet is 611 pixels taller than its window, so it scrolls"
area: play
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On a fresh new game the Guide sheet holds about 611 pixels more than its window shows, so it scrolls.

**Rules.** This is a game, not a spreadsheet: the guide is short and plain, its words come from the English engine and control names.

**Done when.** src/bench/no-scroll.browser.mjs passes for the Guide sheet in a new game in a drawn place.

**Files.** src/bench/play.mjs, src/bench/play.css

**Notes.** Measured Oct 20 by src/bench/no-scroll.browser.mjs; every sheet also showed 3 pixels of overflow on the sheet itself, which the script ignores below 8.
