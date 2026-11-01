---
id: play-news-drop-cap-splits-numbers
title: "The paper's large first letter never splits a number"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr:
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:25 UTC
lead: play-first
milestone: play-first
---

**What.** Owner, Nov 1 playtest of v0.73.0, screenshot of the front page: the closure story's body begins "16 people worked there." and the drop cap printed a large "1" with "6 people worked there." beside it. The front page's drop cap takes the body's first character whatever it is. A body that starts with a digit takes no drop cap, or the whole number is set large. Words is asked to open stories with a word, so this is the layout's guard.

**Rules.** No hand-written player text: screens show record data only through worded labels, and a number split into "1" and "6" is a broken figure on screen (player-screen-text). The front page follows the approved paper mock and its shared parts (screen-to-mock). The lane owns src/bench (play-first LAW).

**Done when.** A test renders a story whose body starts with a number and asserts the number reads whole; a screenshot of the drawn place's front page shows it.

**Time box.** 1 hour.

**You will see.** A story that starts with a number shows the whole number, never a big 1 beside a 6.

**Screenshot.** The closure story on a drawn place's front page.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/news.browser.mjs

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest (Nov 1, 22:25 UTC, five screenshots, New Game). Read: OWNER-DECISIONS (Oct 29 02:35 opening montage and address; Oct 29 address "no real statistic in play"; Oct 26 one scene system), the pool for twins.
