---
id: tests-printed-news-check-open-choice
title: "printed-news.browser.mjs throws when the jump meets an open choice"
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

**What.** printed-news.browser.mjs (Oct 28, drawn life) stopped with 'advance failed: Answer the open choice or stop first.' Its loop answers stops and polling places but not an open choice packet, so the check never reaches the printed story.

**Rules.** A check answers what the game asks the way a player would; never dev mode to get past it.

**Done when.** printed-news.browser.mjs passes on three drawn places with each place and seed named, answering open choices the way a player would.

**Files.** src/bench/printed-news.browser.mjs

**Notes.** TODO
