---
id: tests-printed-news-check-open-choice
title: "printed-news.browser.mjs throws when the jump meets an open choice"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: low
root: rc2-done-from-records
---

**What.** printed-news.browser.mjs (Oct 28, drawn life) stopped with "advance failed: Answer the open choice or stop first." Its loop answers stops and polling places but not an open choice packet, so the check never reaches the printed story. The check jumps the calendar to a target date through /api/advance, resumes any packet of kind stop, leaves a polling place, and throws on any other failed advance. Its comment says a choice is left to the character, but the server now refuses the jump with that message, so the loop must answer the choice the way a player would.

**Cause.** Found in code: src/bench/printed-news.browser.mjs lines 47 to 70 resume packets of kind stop only and throw on any other refused advance, and src/bench/player.ts (line 179) refuses the jump with "Answer the open choice or stop first." while a choice is open.

**Fix.** Answer an open choice packet through the same controls a player uses (the first reply), then continue to the printed story, and print the place and seed on each run.

**Time box.** 2 hours.

**Rules.** A check answers what the game asks the way a player would; never dev mode to get past it. This is a game, not a spreadsheet: the check answers an open choice through the same controls a player uses, not through a side door. One rule, all 56 places: the check draws its place and prints the run and place seeds.

**Done when.** A second session runs src/bench/printed-news.browser.mjs in three drawn places with each place and seed named and sees every run pass, answering open choices the way a player would. A screenshot shows the printed story the check reaches, with the kind of the choice packet it answered.

**Waits on.** Nothing.

**Files.** src/bench/printed-news.browser.mjs, src/bench/player.ts

**Notes.** TODO
