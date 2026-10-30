---
id: play-politics-local-first-page-blank
title: "Politics > Government: Local's first page is blank and its members land on page 2"
area: play
kind: bug
priority: 2
size: S
status: claimed
claimed-by: play-first/play-politics-local-first-page-blank
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T07:45:13.098Z
---

**What.** On main at e34de8c1ee, in Huntington, Virginia (seed bcd0de6c-3b2f-4ad7-9e3f-a54b258bb9fc), Politics > Government > Local opens to an empty page with only the level buttons and a Continue pager. The members are on page 2 because the sheet pager treats the whole government content as one block taller than the page. The player sees a blank Politics screen on the opening night.

**Rules.** This is a game, not a spreadsheet: a screen that opens empty is a defect a player meets, so the first page always shows the first body and its members; nothing inside a menu scrolls, so the content pages by body instead of by one oversize block.

**Done when.** In a drawn place (name the place and seed), a browser check on a restarted bench opens Politics and asserts the first page of Local shows at least one member name; it fails on main in Huntington, Virginia; a 1440x900 screenshot is in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/politics.browser.mjs

**Notes.** Found by the screens designer, Oct 27, while taking the before shot for screens-government-rows-plain. lead: play-first.

- 2026-10-30 (people session, while building faces-at-open.browser.mjs on #6918, branch at main 1060068a2e): Local opens blank in two more places, with no pager visible at 1440x900, only the Local, State and Federal buttons. Washington, District of Columbia (seed 51b9c804-2828-4b4b-a184-0110c81c88ba) and Mendeltna, Alaska (seed 370d25dd-1c82-4e55-aabc-cbd001df3795); Checker 3 waited 60 seconds for any member there and none appeared. Replay with `FACES_SEED=<seed> node src/bench/faces-at-open.browser.mjs` (it now logs "politics: 0 of 0 faces" there instead of waiting). It may be a different cause from the pager: D.C.'s local body is the Council of the District, and Mendeltna is unincorporated, governed by the state with no borough (the Oct 29 22:45 ruling's county-board answer has no county here).
