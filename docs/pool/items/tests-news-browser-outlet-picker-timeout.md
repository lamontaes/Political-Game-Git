---
id: tests-news-browser-outlet-picker-timeout
title: "news.browser.mjs times out waiting for .outlet-picker button on main and on every branch"
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

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** Found by Merger W on Oct 28 while merging #6396: with the new masthead and lead-story assertions passing, src/bench/news.browser.mjs times out at line 170 waiting for locator .outlet-picker button, on origin/main (Marshfield, Massachusetts, seed f6e2d97c-e4b4-49d1-989a-5153e171a6f4) and on the branch in Koblerville, Northern Mariana Islands and Garten, West Virginia. It passed on Oct 27 about 17:55 UTC (South Uniontown, Pennsylvania). Check whether the picker only renders when a world has more than one outlet; make the check skip the layout section or draw such a world.
