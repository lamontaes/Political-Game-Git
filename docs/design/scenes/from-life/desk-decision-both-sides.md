# Episode: the decision on the desk, with both sides in the room

Scenes from life (`scenes-from-life`), owner's Oct 27 executive brief ("signing or vetoing with the sponsor in the room"). Calibration only: no real person's name or words ship, and none are in the packet. Item: `words-scene-desk-visit-sponsor-or-opponent`.

## Sources

- CBS News, February 26, 2014, "Arizona governor says she has vetoed controversial bill", read in full: the bill reached the governor's desk on a Monday with until Friday to act; she consulted her lawyers and heard from supporters and opponents; business groups, a national convention host, a Super Bowl host committee and several large companies pressed for a veto; her office counted more than 20,000 calls and emails and opponents delivered petitions of over 60,000 signatures; she vetoed on Wednesday, saying she knew of no case it would fix, that it was broadly worded and could divide the state; the group that helped write it called it a sad day.
- Current (Carmel, Indiana), November 12, 2014, "Carmel mayor considers veto of conservation district bill", read in full: a 4-3 council vote on a neighborhood ordinance, ten days for the mayor to sign or veto, some council members pressing for a veto because the narrow margin might not survive an override, the mayor undecided and calling himself a consensus-builder; the article ends before any decision.
- Arkansas, April 1, 2015, a governor holding a religious-freedom bill and asking the legislature to change it before he would sign it (UA Little Rock Public Radio, KATV, Governing, search summaries only; pages not opened in full): businesses had urged a veto, and two replacement bills were filed instead of recalling the original.

## Packet

1. A bill passes and is presented to the executive. The clock starts: a few days (the governor) or ten (the mayor).
2. The people who made it pass want a signature; the people it costs want a veto. Neither side decides, and each says what it costs them to be wrong.
3. The margin is part of the argument. A narrow vote makes a veto look safer and an override harder; a wide one makes a veto look like a fight.
4. The executive hears both sides in the days before deciding, and may ask for a fix instead of choosing (the Arkansas stance).
5. The executive decides at the desk. Reasons are given afterward in public.
6. What changes: a law, a relationship with the sponsor (and with the chamber that may override), and a line in the papers.

## Does the engine fire it?

Asked in played worlds (`buildBenchWorld`, two-level, a mayor as the player, a bill passed by the council and presented), drawn places and seeds:

- **Exists and fires:** `bill-presented` (`legislature.ts`) names both the executive and the sponsor in `personIds` and carries the deadline (`signBy`), the bill and the office. The aide's `desk-bill` scene fires on it. That scene brings the file; nobody comes to argue.
- **Exists, nothing fires:** the vote roll (`votesOn`), the sponsor on the bill row, and the lobbying records (`meetingsOn`: a group, its lobbyist, its side and the yearly cost it states). In Sunrise, Florida (seed `69157efce8d06fdabd6556649aa9da6dd2a2f309:3`) the engine's own policy-position group recorded a meeting against a bill with a living resident as its lobbyist; nobody brought them to the executive.
- **Does not exist:** the executive being lobbied. The engine's lobbying meetings are with legislators (`lobbied(api, bill)`); no meeting is with the executive whose desk the bill is on. The scene reads the group's recorded side and cost and casts its lobbyist, which is a reading of an existing record, not a new meeting. A real "the executive hears both sides" record is not filed: the scene stands on what exists, and the next change to that engine would add the executive to the people lobbied.
- **Does not exist:** the executive's decision changing what the visitor does next (an override push, a thank-you). The reply is recorded as `scene.reply`; nothing reads it yet.

## What shipped

- Situation type `desk-visit` (purpose `desk-visit`): the bill's sponsor comes the day the bill is presented; where the sponsor cannot come, the lobbyist of the group whose recorded meetings on the bill are against it comes. New civic fills `sponsor` and `lobbyist`.
- Arc `desk-visit`: the visitor asks for a signature or a veto; four stances for the executive: go the visitor's way, go the other way, ask for a fix first, ask what is behind it. The visitor answers by traits (plea, press, threaten, accept); every ending hands the player to the desk to sign or veto.
- 106 bank pieces with versions by who is asking (the sponsor's lines and the opponent's lines are different pieces) and by bearing, and facts said from the records: the bill, the roll call (yes to no), the day the decision is due, and for the opponent the yearly cost to those they speak for.
- The visit stages before the aide's `desk-bill` scene. Where a visitor can be cast, the visit plays and the aide's does not; the aide's scene is the fallback, as before. This is a choice to flag: it makes the sponsor's visit, not the aide's file, the first thing the player meets at the desk.

## Same producer, two other lives

- The Carmel mayor with a 4-3 vote and allies pressing for a veto: the narrow roll call is in the visitor's words (`{roll}`), and the opponent's case can stand on a margin.
- The Arkansas governor who would sign only with a fix: the `bargain` stance and the "A fix first" ending.

## Gaps left open

- A governor's version fires from the same record (`bill-presented` names the governor in a governor's year) but is not tested here; only a mayor was.
- A residents' group's lobbyist has no stated cost, so the cost line is skipped for it and the visitor argues the margin instead.
- The executive's reply moves no one yet; same gap as the staff scene.
