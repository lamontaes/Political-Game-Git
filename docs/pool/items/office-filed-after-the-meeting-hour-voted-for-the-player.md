---
id: office-filed-after-the-meeting-hour-voted-for-the-player
title: "Bills a town or county body files after its meeting's hour are voted at once, the player's seat Decided for me"
area: office
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: Account lead T35
pr: 9063
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: "Account lead T35, Nov 14, 2026 (found by the three-place sweep of office-board-vote-cast-for-the-player-without-a-stop-again)"
checked:
claimed-at:
---

**What.** An Advanced start as a member of a town council or county board whose first meeting comes the day after the world begins is never stopped at it, and Politics, then Your office lists "Decided for me" on the ordinances voted there. Seen: Grandview, Oklahoma (4030915), seed 80ea7a2f8a3a22473502acd7fa4162c4b06c0db09b05fdefa59390a6f203b46a: the county board meets Jan 21, 2025 at 9 a.m.; ordinances 2025-1 and 2025-2 were filed that day and the player's seat voted "yes, Decided for me" on both without a press.

**Cause.** Found in code: `localMeeting` in src/core2/modules/world-legislating.ts files a meeting with under a day's notice on its own day, at the world-day close, after the meeting's hour on the player's clock. `placeFiled` in src/core2/modules/office-day.ts put the bills on that meeting, where `holdPlayerIfDue` could no longer hold the player (the clock had passed the hour), and `ownVote` cast the player's own position when the meeting voted them.

**Fix.** A bill filed on or after its meeting's day waits for the next meeting whose agenda is not yet posted (`placeOnAgenda`), for every body, so the player is held there like any member; members do not file a change again while it waits (`stillWaiting` beside `recentlyDefeated`).

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No vote is cast in the player's name without the player (CTO, Nov 13, 04:18Z). One rule, all 56 places: the meeting rule comes from each body's data, never a named place.

**Done when.** A second session plays a seated board member in a drawn place, on main, from day one through the body's second meeting; the first meeting's late filings are on the second meeting's panel, the player is stopped there, and no "Decided for me" appears in Your office.

**Waits on.** Nothing.

**Files.** src/core2/modules/office-day.ts, src/core2/modules/world-legislating.ts, src/core2/office-day-budget-vote.test.ts

**Notes.**
