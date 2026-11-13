---
id: play-campaign-board-stays-after-the-race
title: 'After the race is counted, Politics still shows "You are running against Jamie Rice" and Travel still offers the campaign trail'
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: none
source: Playtester P1, Nov 13
claimed-at:
---

**What.** Bryant, South Dakota (bench seed c23677ce-6e29-4a2c-b6f2-210084c22c56, main 5e68cde1): the player lost the April 1, 2025 council race. Through June, Politics → Campaign still read "Where the race stands / You have reached 137 voters so far. … You are running against Jamie Rice. / So far 185 voters have heard from Jamie. / A poll of 50 voters would cost $2,250", and listed "Signatures 51 of 10, due February 28". Travel still held the campaign trail with Volunteers, Ad, Poll, Mail and Give a speech for a race that was over. Curtisville, Pennsylvania (24b09c77-0589-433f-9b6b-0c77e53b4ff7) did the same after the player won in November. Seen: the Campaign tab and Travel's trail after election day.

**Cause.** Found in code: src/bench/campaign.ts `campaignView` lists every filing of the player's except a withdrawn one. A filing stays `on-ballot` after its count (src/core2/modules/elections.ts `FilingRow.status` has no state for a decided race), so a decided race's board and trail are served as if the race were running. src/bench/play.mjs `campaignParts` and the Travel trail card draw whatever it serves.

**Fix.** In `campaignView`, serve only campaigns whose contest has not been counted yet. Read the contest's result record (`resultOf`) or its election date against today. A decided race leaves the Campaign tab and Travel. Its result stays on Elections and in the Journal, which already read the count. Check each caller (dev-mode's campaign list, the campaign tests) and keep any that need a past race on its own reader, not this one.

**Time box.** 2 hours for one Sonnet session.

**Rules.** One rule, all 56 places: the board reads the contest's own count record, with no place named. Two screens never disagree: a race the returns called is not "running" anywhere.

**Done when.** A second session, on main, plays a new life in a drawn place through a race the player filed for, presses Day after the count, and takes a screenshot of Politics and Travel. Neither shows the decided race's board or trail, and Elections shows its result.

**Waits on.** Nothing.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/bench/dev-mode.ts
