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

**What.** printed-news.browser.mjs (Oct 28, drawn life) stopped with 'advance failed: Answer the open choice or stop first.' Its loop answers stops and polling places but not an open choice packet, so the check never reaches the printed story. The check is src/bench/printed-news.browser.mjs: it jumps the calendar to a target date through /api/advance, resumes any packet of kind stop, leaves a polling place, and throws on any other failed advance (around line 60). Its comment says a choice is left to the character, but the server now refuses the jump with that message, so the loop must answer the choice the way a player would.

**Rules.** A check answers what the game asks the way a player would; never dev mode to get past it. This is a game, not a spreadsheet: the check answers an open choice through the same controls a player uses, not through a side door. One rule, all 56 places: the check draws its place and prints the run and place seeds.

**Done when.** printed-news.browser.mjs passes on three drawn places with each place and seed named, answering open choices the way a player would, and the PR shows a screenshot of the printed story the check reaches with the kind of the choice packet it answered.

**Files.** src/bench/printed-news.browser.mjs

**Notes.** TODO
