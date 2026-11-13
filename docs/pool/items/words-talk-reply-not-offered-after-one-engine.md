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
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-words-talk-reply-not-offered-after-one-engine
---

**What.** A talk rejects a reply the screen offered. Confirmer replay of Lane 3 path 4 on main 516a0f9070 (includes #7267, everyday talk on one engine): New Game in Murray, Nebraska (3133425, replay 1d3f0e18ca4ba7e5), the player answering each talk with its first reply, played week by week from January 2025 to November 2026. The page threw three errors from /api/talk/say: 'Not an offered line: 4:ack:right.conversation.greet-answer-fine.all-right' twice and 'Not an offered line: 2:well'. The same script and town ran with no page errors before #7267 (main 21830c5ce8). The replies were on screen when pressed; whether a press during the next line's load causes it is not known.

**Cause.** Found in code: a reply stays live after it is pressed, so a second press sends the turn before. `say()` in src/director/conversation.ts (line 3045) accepts only a key in `conversation.choices`, and each key starts with the turn it was offered on (`${turn}:${choiceKey}`, line 2649; the error's keys "4:ack:right.conversation.greet-answer-fine.all-right" and "2:well" have that form). In src/bench/play.mjs, `sayLine` posts `/api/talk/say` and re-renders only when the answer comes back, with no guard while it is in flight. `talkReply` and `mountTalkKeys` in src/bench/ui/talk-box.mjs never disable a reply button, and a number key clicks `talk-choices` children directly. So a second press of the same reply in that gap posts the old turn's key. That can be a double click, a quick number key, or a replay that clicks the first reply before the re-render. The first press has already moved the talk on, and the second is refused with "Not an offered line". The bench keeps one `state.conversation` (src/bench/handler.ts, `/api/talk/say`), so a reply from a talk that another talk replaced is refused the same way. Not reproduced from the Lane 3 replay, whose script is not in the repository. The cause is read from the code.

**Fix.** In src/bench/play.mjs, make a talk reply count once. When `sayLine` starts, disable the box's reply buttons and set an in-flight flag that `mountTalkKeys`'s handler respects. Clear it in `renderTalk`, which replaces the buttons anyway, and on an error, so the player can press again. Do the same in the purpose-scene reply handler (the `play` closure that posts `/api/story/reply`), which has the same shape. Keep the engine's throw in `say()`: the rule is never to drop an answer silently, and this fix prevents the stale press instead of hiding it. Add a browser check to src/bench/talk-box.browser.mjs that double-clicks the first reply of a talk and sees one line added and no page error.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what is known, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the reply the screen shows is the one the conversation engine accepts. Never hide the error or drop the player's answer silently. Ask why: the finding names by file and line why the screen offered a line the engine then refused, before either side changes.

**Done when.** A second session (not the builder) opens a talk in each of two drawn places from all 56 (place and seed named), double-clicks the first reply and presses its number key twice, and sees exactly one reply said each time and no "Not an offered line" error. The new browser test in src/bench/talk-box.browser.mjs passes, and it fails on main with the error.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/ui/talk-box.mjs, src/bench/handler.ts, src/director/conversation.ts, src/bench/talk-box.browser.mjs

**Notes.** TODO

**Notes (re-run, 2026-11-10, main b4422d346c).** Skipped: the item names no command, only a replay script and town that are not in the repository (the replay of Lane 3 path 4 in Murray, Nebraska, replay 1d3f0e18ca4ba7e5). Nothing was run.

Nov 11 (cause finder for Fable B): traced in code. The reply key carries its turn, the screen keeps replies live while a press is in flight, and nothing disables them, so a second press is the turn before. The Lane 3 replay script is not in the repository, so I could not replay it. Whether #7267 made the window longer (a slower `say`) is not known.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 09:10 UTC) on branch claude/pool-words-talk-reply-not-offered-after-one-engine.

Released (2026-11-11): Cap is on (AGENTS.md, owner Nov 11: no new item while over 150 game PRs are open; 381 PRs open now); next handed it out when gh could not open the draft PR and probably could not count. Not started. Continue on branch claude/pool-words-talk-reply-not-offered-after-one-engine.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 10:14 UTC) on branch claude/pool-words-talk-reply-not-offered-after-one-engine.

Released (2026-11-11): Cap is on (260 game PRs open, cap 150); next prints the cap and still claims this bug item, which is not a red, rule, check or skill. Not started. Continue on branch claude/pool-words-talk-reply-not-offered-after-one-engine.
