---
id: talk-box-says-a-line-the-talk-did-not-offer
title: 'A scripted walk of the talk box sends the choice "1:yes" and the page throws "Not an offered line"'
area: play
kind: bug
priority: 3
size: S
status: open
standard: 2
model: sonnet
effort: medium
root: none
after:
claimed-by:
pr:
blocked-on:
lead: screens
source: Journal builder (#9119), play-walk at 238e925b, Nov 15
claimed-at:
---

**What.** In the six-month play-walk at New Haven, Vermont (new life, seed `c9053b03e98d459361bb0fc1feab0c7eaaa5f1ad789861d85de6bc69a18ad2f8`, place key 5048550, `BENCH_SEED=… BENCH_PLACE_KEY=5048550 node scripts/play-walks/journal-six-months.mjs <dir>`) the page threw one error, "Not an offered line: 1:yes", when the walk chose an answer the talk had not offered. It did not recur at #9119's later head (657c615b) in the same world, so it depends on the talk being asked. Seen: in the running game, as a red page error in the walk's log; a player who clicks a stale choice would see the talk do nothing.

**Cause.** Found in code: src/director/conversation.ts (7717) throws in `sayNow` when `choiceKey` matches neither `conversation.choices` nor `conversation.lies`; the walk's playTalk (scripts/play-walks/lib.mjs) chooses by a key it read from an earlier talk step, and the screen sends it after the talk moved on. The two sides are not shown to differ in a unit test.

**Fix.** Reproduce with the command above at the claim; make the screen send only keys of the talk it is showing (read the key at click time from the current step), or have `sayNow` refuse a stale key by returning the conversation unchanged and the screen re-read it; add a failing-before test at the pinned place and seed. Which of the two is right is the item's builder's call after reproducing.

**Time box.** 3 hours.

**Rules.** Read-only screens spend no game time and create no facts; a stale click must not record a choice.

**Done when.** At the pinned place and seed the walk logs no page errors through its six months, and a second session sees the talk accept the next answer in the running game.

**Waits on.** nothing.

**Files.** src/director/conversation.ts, scripts/play-walks/lib.mjs
