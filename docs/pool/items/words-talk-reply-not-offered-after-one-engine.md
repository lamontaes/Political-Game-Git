---
id: words-talk-reply-not-offered-after-one-engine
title: "A talk rejects a reply the screen offered: 'Not an offered line'"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Confirmer replay of Lane 3 path 4 on main 516a0f9070 (includes #7267, everyday talk on one engine): New Game in Murray, Nebraska (3133425, replay 1d3f0e18ca4ba7e5), the player answering each talk with its first reply, played week by week from January 2025 to November 2026. The page threw three errors from /api/talk/say: 'Not an offered line: 4:ack:right.conversation.greet-answer-fine.all-right' twice and 'Not an offered line: 2:well' (src/director/conversation.ts:2966, say()). The same script and town ran with no page errors before #7267 (main 21830c5ce8). The replies were on screen when pressed; whether a press during the next line's load causes it is not known.

**Rules.** One engine per mechanic: the reply the screen shows is the one the conversation engine accepts. Never hide the error or drop the player's answer silently.

**Done when.** A fresh session replays New Game in Murray, Nebraska at replay 1d3f0e18ca4ba7e5 on main, answering every talk with its first reply through November 2026, and the page shows no 'Not an offered line' error; a test plays a greeting answered 'All right' and the following ack and passes; the same in two places drawn from all 56 (place and seed named).

**Files.** src/director/conversation.ts, src/bench/play.mjs

**Notes.** TODO
