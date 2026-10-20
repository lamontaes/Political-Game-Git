---
id: play-politics-sheet-scrolls
title: "The Politics sheet is 2,631 pixels taller than its window, so it scrolls"
area: play
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On a fresh new game the Politics sheet holds about 2,631 pixels more than its window shows, so the player scrolls it, which the owner ruled out for main screens (M6-02). The measurement is by src/bench/no-scroll.browser.mjs, at the start and after a day, on a 1672 by 941 window. The sheet should page or fold what it holds so it fits, as the other sheets do.

**Rules.** This is a game, not a spreadsheet: the sheet shows what the player could use now, not every record, and the words come from the English engine and control names, nothing typed into the screen.

**Done when.** In a browser run of src/bench/no-scroll.browser.mjs against the bench in a new game in a drawn place, the Politics sheet's body and the page report no overflow beyond 8 pixels at the start and after a day, with the same records still reachable by paging or a control, and the script passes for every sheet.

**Files.** src/bench/play.mjs,src/bench/play.css,src/bench/no-scroll.browser.mjs

**Notes.** TODO
