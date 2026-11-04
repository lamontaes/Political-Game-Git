---
id: play-news-reader-lead-without-text-crashes
title: "Clicking the first night's paper throws in readerBody and the reader never opens"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On a fresh life, after the President's address, the paper on the table opens nothing when clicked. The page throws TypeError: Cannot read properties of undefined (reading 'map') at readerBody (src/bench/ui/newspaper.mjs:288), called by openNewsReader (play.mjs:270). The lead story the opening keeps has neither printed paragraphs nor a broadcast, so the reader maps an undefined list. Found by continue-news.browser.mjs on a fresh bench, Nov 3, once the browser checks play the address.

**Rules.** This is a game, not a spreadsheet: the first night's paper is a screen the owner opens in his first minute, and a click that does nothing reads as a broken game. Replace, never layer: the reader reads whatever text the kept story holds, with no second reader beside it.

**Done when.** On a fresh bench in three places drawn from all 56, named with their seeds, clicking the paper on the first night opens the reader with the lead story's text, src/bench/continue-news.browser.mjs prints its pass line, and a screenshot at 1440x900 shows the open reader.

**Files.** src/bench/ui/newspaper.mjs, src/bench/play.mjs, src/bench/continue-news.browser.mjs

**Notes.** TODO
