---
id: play-meetings-spend-none-of-the-players-time
title: "A council or board meeting takes none of the player's evening"
area: play
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: found while building meetings-resident-player-speaks-at-public-comment
---

**What.** A player held at a meeting, as a member or as a resident who came to speak, leaves it at the same minute it began. The meeting's own record says how long it runs (150 minutes for a county board, for example), but the player's clock does not move, so an evening meeting costs nothing against work, family or a campaign. Seen: the clock on the player card after Adjourn or Leave on the meeting panel.

**Cause.** Found in code: src/bench/handler.ts, the POST /api/meeting/adjourn route, calls meetingAdjourn and sends null; nothing spends the meeting's `minutes` (src/core2/modules/office-day.ts, MeetingRow.minutes, from the body's meeting rule) through the player's clock, the way POST /api/goto/visit spends a trip and a visit with `state.player.spend`.

**Fix.** On adjourning or leaving, spend the meeting's recorded minutes on the player's clock through the existing `spend`, after the held stop is answered, for a member and a resident alike. Use the meeting's own length from its rule; add no new number. A player who leaves early is a design question for the owner and is not part of this item: everyone stays the meeting's length.

**Time box.** 2 hours

**Rules.** One engine per mechanic: the player's clock and its `spend`. Every number lives in a parameter table: the meeting's length is the body's sourced rule. This is a game, not a spreadsheet: no new step for the player.

**Done when.** A second session sees it in the running game: in a drawn place and seed the builder did not choose, a player held at a meeting that starts at 6 p.m. and whose record says 150 minutes presses Adjourn or Leave, and the player card's clock reads 8:30 p.m.; the speed:year time is no more than 20 percent over main.

**Waits on.** Nothing.

**Files.** src/bench/handler.ts, src/bench/player.ts, src/core2/modules/office-day.ts
