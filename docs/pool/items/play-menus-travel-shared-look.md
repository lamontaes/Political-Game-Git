---
id: play-menus-travel-shared-look
title: "Travel follows its mock: large pictured tiles, three across, paged"
area: play
lead: play-first
kind: feature
priority: 2
size: S
status: done
claimed-by: play-first/play-menus-travel-shared-look
pr: #6879
blocked-on:
milestone: play-first
source: CTO, Oct 29 (every menu redesigned the way Government was; MOCKS travel.png)
claimed-at: 2026-10-30T03:10:00.000Z
---

**What.** Travel moves to its mock (`docs/ui/mocks/screens-2026-10-14/shots/travel.png`): large pictured tiles three across and two rows to a page, a people mark on the picture's corner where people are to be met, the place's name and who is there under it, arrows to page the rest. The list screen's shared `pages` option does the paging, so the Guide and Issues can use it too.

**Rules.** Screen to mock (`screen-to-mock`); replace, never layer (the old four-across card grid for Travel is gone); the menu never scrolls as a page; the "you are at home" line stays out (owner, Oct 27, no line restating where you are).

**Done when.** `src/bench/travel.browser.mjs` shows at most six tiles to a page, the arrow turning to other places, the people mark, no scroll; screenshots in `docs/play-first/shots/play-menus-travel-shared-look/`.

**Time box.** 1 hour, Sonnet.

**You will see.** Travel looks like its mock.

**Screenshot.** Travel, before and after.

**Files.** src/bench/ui/list-screen.mjs, src/bench/play.mjs, src/bench/play.css, src/bench/travel.browser.mjs

**Notes.** Stacked on #6844 (`cto/menus-person-card`). `travel-place.browser.mjs` times out clicking Leave after Go on the unchanged branch too; not from this change.
