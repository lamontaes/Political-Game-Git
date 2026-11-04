---
id: tests-talk-history-one-exchange
title: "talk-history.browser.mjs expects two exchanges; the first talk after the address has one"
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

**What.** src/bench/talk-history.browser.mjs talks to the first person in the room and picks a reply twice to build a history block. Since the talk after the President's address was rewritten, that talk has one exchange: a reply, the person's answer with Continue, then it ends (Nibbe, Montana, seed 9300f75f-9b1d-48b4-8d84-c409754ff9a4). The check then fails with no second reply, so the history display goes unchecked.

**Rules.** Wire to the world: the check reads a talk the game really plays, in a place drawn from all 56, never a hand-made talk; loosening it to one exchange without checking the history block would be a check with nothing to check.

**Done when.** talk-history.browser.mjs passes on a fresh bench in three drawn places named with seeds, reading a history block from a talk that has at least two exchanges in play, using the shared start-a-life helper in src/bench/start-life.mjs.

**Files.** src/bench/talk-history.browser.mjs, src/bench/start-life.mjs

**Notes.** TODO
