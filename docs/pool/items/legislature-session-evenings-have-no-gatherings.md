---
id: legislature-session-evenings-have-no-gatherings
title: "A legislature in session has no evening receptions or dinners, so colleagues end a session near strangers"
area: people
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: legislature-colleague-ties-stay-slight
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Found by the lying thread, Nov 15 2026, measuring legislature-colleague-ties-stay-slight (the Account lead named it cause 1 of 3 and asked for it as its own item)
---

**What.** A legislator's colleague ties come only from the hours the chamber, its committees and caucuses sit, divided among the colleagues each member knows, plus a little free company. In a real session the evenings are full of receptions, dinners and association events where the same members meet again and again; the game has none of them. At 4846968 (Texas) seed 8647-mason, with rooms and attendance in place, the player (seat 016) ends the 2025 session (June 2) with a median closeness of 0.121 to fellow senators and a top of 0.298; two members of the same committees end at 0.142 to 0.168. So a senator asking a committee colleague for a vote on the eve is asking a near stranger. Seen: on a colleague's person card after a session, and in whether the evening vote ask lands ("I'm not there yet.").

**Cause.** Found in code: nothing writes a session evening. Interest groups already keep a lobbyist who meets each member voting on a bill they care about (src/core2/modules/interest-groups.ts, the `meetings` table, `LobbyMeeting`), but only one to one, with a 0.1-hour `contact`. The shared-hours readers (src/core2/sitting-closeness.ts, `registerSittingCalendar`) read sittings, chamber rooms (src/core2/office-day-state.ts, `ROOMS`) and town bodies, and no calendar holds an evening where several members are in one room.

**Fix.** Let the interest-groups engine hold its evenings, and read them through the calendar reader that already exists. While a chamber sits (`legislatureDay(stateKey, date).floor` or `.committee`), each group with a bill before the chamber keeps a reception row in its own table: the group, the date, and the members it invites (those it would lobby, from `lobbied`). Which evenings a group holds comes from its money and the bills it has before the chamber, never a chance. Each invited member attends or not from their own day, the same way `missesSitting` weighs a sitting against the rest of the day (stake in the group's bills, traits, closeness to the lobbyist); a member who stays away is an absence. Register the receptions as a `SittingCalendar` (`owns`, `seats`, `sittings`, `absences`, `contactHoursPerDay`) so the hours go to every pair who attended, divided among the colleagues each knows, exactly like a committee room. The lobbyist sits too, so the group's ties grow the same way. One new parameter row for an evening's length, ESTIMATED with its spread, labeled from memory if no source can be fetched. Day zero: a world opening mid-session already has the season's receptions, made by running the same step over the opening days, never a hand-filled list.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a group's evenings come from its money and its bills, attendance from each member's own day. One engine: interest groups write the record, the existing calendar reader reads it; no second closeness writer and no spendTime for the evening. Speed: one row per group per evening, read through the reader's per-day cache; no scan of every person. Wire to the world: the lobbyist's ties and the group's case read the same evenings.

**Done when.** A pinned test at 4846968 seed 8647-mason (about a minute, seen red on today's code) shows that senators on the same committee who attended the same receptions end the 2025 session closer than those who shared only the floor, with the reception ids named. A played year in a drawn place, and at three named places, stays within the speed bar, with each outcome change traced by record. A second session sees in dev mode on main a reception on a sitting legislator's Journal and the colleague met there closer on their person card.

**Waits on.** legislature-colleague-ties-stay-slight (rooms and attendance), so the evening divides its hours the same way the rooms do.

**Files.** src/core2/modules/interest-groups.ts, src/core2/sitting-closeness.ts, src/core2/office-day-state.ts, src/core2/data/campaigns/parameters.json
