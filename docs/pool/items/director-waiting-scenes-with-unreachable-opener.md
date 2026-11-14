---
id: director-waiting-scenes-with-unreachable-opener
title: "Scenes scheduled as waiting whose opener is in no room the player reaches never play"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: fixer, Nov 12, while proving PR 8900 (a reporter's question about the player's own bill never reached a stepped-in council member)
checked:
claimed-at:
---

**What.** The director schedules a scene that is not an interrupt as "scene-waiting": it plays only when the player goes to the person who opens it. When that person is a reporter, an executive, an appointer, a clerk, a department head or a rival, they are in no room the player can reach, so the scene never plays. The press-interview type had this fault until PR 8900 marked it `stopsDay`. Seen: the calls, visits and news these scenes carry (a winner's concession call, a veto, an appointment, a cut department's head) reach the player in play.

**Cause.** Found in code: `src/director/scheduling.ts`, `scheduleMoment` (the outcome near line 1105) makes a non-interrupt moment "scene-waiting" whatever its opener's fill, and nothing in `src/bench` plays a waiting scene except where its people are in the room. Candidates from reading `src/director/data/situation-types.json` (opener's fill outside household, circle and the rooms the player visits; none `stopsDay`, none matching `metWhereYouAre`): concession-taken (winner, phone), concession-received (opponent, phone), veto (executive, venue or phone), bill-signed (executive, venue), appointment (appointer, venue or phone), scandal (press, home or phone), filing (clerk, venue), news-arrives on an eviction (authority), advice (authority), desk-visit (sponsor or lobbyist, office or phone), desk-bill (staff or clerk, office), staff-news (staff or staff-or-ally, office or phone), bill-held-chair and bill-held-member (bill-sponsor), budget-cut (department-head, office or phone), floor-vote and public-hearing (chair, venue), layoff (decider, workplace). Some of these may play through a screen of their own (the meeting, the desk, the office); each must be confirmed by a played world before it is changed.

**Fix.** For each type in the list, play a drawn place through the bench routes to the type's cause and record whether the scene reaches the player. Where it does not, give the type the rule that fits what it is: `stopsDay` for a call or visit that comes to the player (as took-office and press-interview), or a cast that puts the opener in the room the player is in. No new pacing number: the existing interrupt rules space them.

**Time box.** 4 hours.

**Rules.** One engine: the director's scheduling decides, the types file says which rule each type follows. Wire to the world: proven by playing, never by calling `purposeScene` on a schedule row.

**Done when.** A second session plays a drawn place for each fixed type through the bench routes (or the running game) to its cause and sees the scene stop the player's day or appear in the room they are in, and records the types that already played through their own screen.

**Waits on.** Nothing.

**Files.** src/director/scheduling.ts, src/director/data/situation-types.json, src/bench/player.ts
