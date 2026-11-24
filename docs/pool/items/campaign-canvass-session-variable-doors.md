---
id: campaign-canvass-session-variable-doors
title: "A canvassing session: hours in, signatures out, and anywhere from no door scene to several, each told by where it fell in the session"
area: elections
kind: feature
priority: 1
size: M
status: claimed
standard: 2
claimed-by: claude/pt-board-canvass-session
pr:
blocked-on:
source: The owner's grading page, Nov 24 (docs/coordination/grading/2026-11-24-page-1-verbatim.md and 2026-11-24-page-1-rows.md on claude/cto-playtest-nov23, rows P45 to P52, order 6); the CTO's 20:39Z line on #9750 (7143874990), routed by the Coordinator to Board mock (lane 8)
claimed-at: 2026-11-24T20:55:00.000Z
after:
lead: governing
model: opus
effort: high
root: none
---

**What.** The owner, Nov 24: "you might get 50 signatures. You might not even have a scene. You might get 32 and have 2 scenes ... it's just variable" (P46), and "after 2 hours, you come across a man mowing his lawn, you reach out and extend your hand" (P47). Today a canvass shift gives at most one porch scene, and its narration says the clock: "Late in the morning on January 21st, you knock, and Frederick" (P45, scene 6.1). Seen: on Politics, Campaign, a day of knocking on doors spends its hours at the doors, gathers what the doors give, and stages no scene, one, or several, one for each door with a reason, each opening on how far into the session it is and what the player sees there, never the clock.

**Cause.** Found in code:

1. `doorsKnocked` (src/director/doors.ts) returns the day's doors as circumstance records and marks one of them `stake: "true"`, the single household with the most at stake (the Oct 8 porch design).
2. `produceCircumstances` (src/director/ledger.ts) stages at most one scene from circumstance a day, spaced by `directorCircumstanceEveryDays`. A day's records that are not picked are dropped (`circumstanceQueue.splice`). So a session yields exactly one door scene, or none when another scene from circumstance took the week, and never more.
3. The campaign engine's door record (`CauseRow`, src/core2/modules/campaigns.ts) keeps only the date. `walkWith` walks the doors in order at `doorsPerCanvasserHour` but records no place in the session, so no line can say "after two hours". The only time a bank piece has is the clock.
4. `knockDoors` fills in at most `fillCounted` counted residents, the ones the evening's single porch scene could cast (owner, Oct 27, "a short scene at 1 or 2 doors"). A second door with a reason has no full person to cast.

**Fix.** One engine for doors, no second walk.

- **Campaign engine.** Each door that opens records where it fell in the session: minutes in, from its place in the walk and the canvasser's doors an hour. The session itself is kept as one record: hours, doors knocked, doors opened, signatures added and pledges. This is the record the session's closing line, the Journal and the Campaign screen read.
- **Director.** Every door of the player's session whose resident has a reason of their own is a scene candidate: a cause on record (any variant but the plain one, as `doorsKnocked` already measures it), a tie to the player, or a strong agreement or disagreement with the platform, read as a sliding scale against the session's other doors, not a cut-off. They play in session order as one lived run, not held to the week between scenes from circumstance (`row.lived`). A session with no such door stages none and ends on its count. `knockDoors` fills in every resident a scene casts.
- **Facts for the lines.** Hours into the session and what the door shows (the home's own record: a yard, a porch, someone outside), each cited to its record. Never the clock.
- How many signatures and scenes come only from causes: the hours spent, the district's households, who is home at that minute, their ties, views and traits, and the campaign. No roll and no fixed rate decides a door.

**Time box.** 30 minutes to file, 3 hours to build.

**Rules.** No dice; sliding scales and causes; one engine per mechanic (the one door walk and the one circumstance producer); one rule, all 56 places; every effect triggerable in dev mode and traced (the canvass is a campaign day dev mode already runs); no hand-written player text.

**Done when.** A second session, in a drawn place where the player has filed, runs several days of knocking on doors through the campaign day and sees sessions end with different signature counts and different numbers of door scenes (at least one session with none and one with two or more), each door scene opening on its time in the session and never the clock; a drawn-place test shows the same, naming each session's record id and its doors' cause ids; and a screenshot reached by playing shows a door scene that opens on its place in the session.

**Waits on.** The door lines are W6's (Story): the player's own introduction as canvassers give it (P48), and door answers from real canvassing accounts, filed as elements first (P50). Until those land, scenes play on the existing `ask-signature` and `ask-support` banks.

**Files.** src/core2/modules/campaigns.ts, src/director/doors.ts, src/director/ledger.ts, src/director/data/circumstances.json, a drawn-place test (new)

**Lines needed, for Story.** A session's opening and closing narration with a `{session-hours}` slot and a door's `{scene-detail}` slot. The player's introduction. The door answers.

**Notes.** Filed by Board mock (lane 8), Nov 24. Related, not twins: director-canvass-meets-people-where-they-are (meeting a voter away from their door) and director-producer-canvass-visit (done: the single porch scene this replaces).
