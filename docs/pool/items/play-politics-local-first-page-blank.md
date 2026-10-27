---
id: play-politics-local-first-page-blank
title: "Politics > Government: Local's first page is blank and its members land on page 2"
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

**What.** On main at e34de8c1ee, in Huntington, Virginia (seed bcd0de6c-3b2f-4ad7-9e3f-a54b258bb9fc), Politics > Government > Local opens to an empty page with only the level buttons and a Continue pager. The members are on page 2 because the sheet pager treats the whole government content as one block taller than the page. The player sees a blank Politics screen on the opening night.

**Rules.** This is a game, not a spreadsheet: a screen that opens empty is a defect a player meets, so the first page always shows the first body and its members; nothing inside a menu scrolls, so the content pages by body instead of by one oversize block.

**Done when.** In a drawn place (name the place and seed), a browser check on a restarted bench opens Politics and asserts the first page of Local shows at least one member name; it fails on main in Huntington, Virginia; a 1440x900 screenshot is in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/politics.browser.mjs

**Notes.** Found by the screens designer, Oct 27, while taking the before shot for screens-government-rows-plain. lead: play-first.
