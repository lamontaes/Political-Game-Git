---
id: play-talk-no-say-nothing-when-nothing-left
title: "The talk box shows Say nothing even when the person has nothing left to say"
area: play
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-talk-no-say-nothing-when-nothing-left
pr: #8517
after: 
blocked-on:
lead: play-first
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
claimed-at: 2026-11-11T03:13:35.907Z
---

**What.** The talk box always shows the Say nothing button. A talk whose reply list is empty still offers it, which breaks the owner's Oct 27 ruling that when there is nothing left to say there must be no say nothing. The player is left with a button that does nothing useful and no way to tell the talk is over except Leave.

**Cause.** Found in code: renderTalk in src/bench/play.mjs (line 1364) calls talkControls({ silent: true, leave: true }) whatever value.choices holds; talkControls in src/bench/ui/talk-box.mjs toggles the no-silent class from that flag alone.

**Fix.** Pass silent as whether the shown choices (lying set or true set) is non-empty, leave stays true. Test: a talk-box browser test in two drawn places (drawPlace, place and seed named) where one talk has replies (Say nothing visible) and one has none (Say nothing hidden, Leave visible).

**Time box.** 2 hours

**Rules.** Look before you ask: owner Oct 27 ruling quoted in play-stop-01-talk-says-nothing. Wire to the world: choices come from the engine's reply list, nothing typed.

**Done when.** In two drawn places a talk with replies shows Say nothing and a talk with no replies hides it and still shows Leave, with the place and seed named in each assertion. A second session sees in the running game, on main, in a place and seed nobody chose, a talk with nothing left to say show only Leave, and records it with pool seen.

**Waits on.** Nothing

**Files.** src/bench/play.mjs, src/bench/ui/talk-box.mjs, src/bench/talk-box.browser.mjs
