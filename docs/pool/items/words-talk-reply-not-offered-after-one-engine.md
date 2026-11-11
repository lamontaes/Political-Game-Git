---
id: words-talk-reply-not-offered-after-one-engine
title: "A talk rejects a reply the screen offered: 'Not an offered line'"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: opus
effort: high
root: rc2-done-from-records
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** A talk rejects a reply the screen offered. Confirmer replay of Lane 3 path 4 on main 516a0f9070 (includes #7267, everyday talk on one engine): New Game in Murray, Nebraska (3133425, replay 1d3f0e18ca4ba7e5), the player answering each talk with its first reply, played week by week from January 2025 to November 2026. The page threw three errors from /api/talk/say: 'Not an offered line: 4:ack:right.conversation.greet-answer-fine.all-right' twice and 'Not an offered line: 2:well'. The same script and town ran with no page errors before #7267 (main 21830c5ce8). The replies were on screen when pressed; whether a press during the next line's load causes it is not known.

**Cause.** Needs cause. The error is thrown in say() at src/director/conversation.ts:3056 (`Not an offered line`). Looked at that function and the replay above; why the offered key differs from the accepted key (a stale reply list, a changed id after #7267, or a press during the next line's load) is not found.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one session of the Opus model, to find the cause and then write it into this item. When it runs out, push what is known, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the reply the screen shows is the one the conversation engine accepts. Never hide the error or drop the player's answer silently. Ask why: the finding names by file and line why the screen offered a line the engine then refused, before either side changes.

**Done when.** A second session (not the builder) replays New Game in Murray, Nebraska at replay 1d3f0e18ca4ba7e5 on main, answering every talk with its first reply through November 2026, and the page shows no 'Not an offered line' error; a test plays a greeting answered 'All right' and the following ack and passes; the same holds in two places drawn from all 56 (place and seed named).

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/bench/play.mjs

**Notes.** TODO

**Notes (re-run, 2026-11-10, main b4422d346c).** Skipped: the item names no command, only a replay script and town that are not in the repository (the replay of Lane 3 path 4 in Murray, Nebraska, replay 1d3f0e18ca4ba7e5). Nothing was run.
