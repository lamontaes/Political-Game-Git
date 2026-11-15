---
id: government-executive-leaders-meeting-as-sitting
title: "A governor meets the legislature's leaders while it sits, as a meeting on the sitting calendar"
area: gov
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Account lead, Nov 15 19:14Z, review of #9543 (the governor's leader hours taken out as a stand-in for a meeting that was never built)
---

**What.** A governor (or the President, or a county executive who does not preside) sits with no body, so shares no time with the legislature's leaders, and the two greet each other as strangers or only as names on a record. Real governors meet the leaders regularly while the legislature sits. The game keeps no such meeting: hours with no event on anyone's calendar were taken out of #9543 for that reason.
Seen: in dev mode at a drawn state, the governor and the speaker read no shared sitting and no tie on day one.

**Cause.** Found in code: src/core2/modules/world-legislating.ts SITTING_CALENDAR (seats, bodiesOf, sittings) seats only a body's members and, since #9543, an executive who sits with the body (executive-sittings.json `sits`); no body holds the executive and the leaders (src/core2/modules/leadership.ts leaderOf), and the department-head meeting (src/core2/office-day-acts.ts "meet-department-head") and the staff briefing (src/core2/modules/staff.ts) write no executive-legislator time.

**Fix.** Add a leaders' meeting as a body of the one sitting calendar, the way committees and caucuses are being added (lying thread, item legislature-colleague-ties-stay-slight): seats are the executive and the chamber's leaders (leaderOf for each leader post), sittings are one per floor week of the session (sittingsBetween), with how often and how long an ESTIMATED row with spread; the player as governor or as a leader sees it on the office day's calendar and attends it.

**Time box.** 4 hours, one Opus session at medium effort.

**Rules.** Wire to the world: the meeting is an event on the sitting calendar the player can attend and see, read by the one shared-sitting reader, never hours with no event behind them. One rule, all 56 places: which leaders exist is chamber data.

**Done when.** At a drawn place with a seed nobody chose, a governor and the chamber's leaders share sittings of the leaders' meeting on day one and greet as met; the player as governor sees the meeting on the office day; a second session sees it in dev mode.

**Waits on.** #9543 (the executive seated at a body's sittings) and legislature-colleague-ties-stay-slight (bodies beyond the chamber on the sitting calendar).

**Files.** src/core2/modules/world-legislating.ts, src/core2/data/legislature/executive-sittings.json, src/core2/modules/leadership.ts, src/core2/office-day-state.ts
