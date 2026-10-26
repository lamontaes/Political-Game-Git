---
id: play-results-sheet-opens-on-every-load
title: "The Election Night sheet opens again every time the play page loads, months after the count"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Loading the play page opens the Election Night sheet over the day whenever the player's town has any past result, even two months after the count. In the bench in White Sulphur Springs, Montana (3080050), place seed e6253d7d132141ef79226210a85a474e90a1d2bb2d5ea41a69c63b9bfdb96035, on January 3, 2026, the sheet showed the November 4, 2025 council and mayor results on load and hid the Day and Week buttons until it was closed. The cause is in refresh() in src/bench/play.mjs: seenResults starts at zero on every page load, so every result already on record counts as new and opens the sheet.

**Rules.** No hand-written player text: the sheet shows record data only, and nothing here adds words to it. Ask why: whether a result is new comes from the record's own date against the player's day, not from what this page happened to see. One rule, all 56 places: the same rule for every place's results.

**Done when.** In the bench, in a drawn place with its seed named, a page loaded more than a day after a count opens on the day with Day and Week showing and no Election Night sheet, and the sheet still opens on its own on the night of a new count. A bench screenshot at 1440x900 of each, with the place and seed under it, and the results browser check pass.

**Files.** src/bench/play.mjs

**Notes.** TODO
