---
id: play-party-joined-scene-at-the-office
title: "Joining a party plays a welcome at the party's office with its leader, and the journal keeps the day"
area: play
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: play-join-a-party-has-no-scene-and-no-headquarters
blocked-on:
lead: words
model: opus
effort: medium
root: rc6-scenes-repeat
source: added with npm run pool -- add
---

**What.** Owner, Nov 8: "I clicked join Democrat. Nothing happened. I expected maybe a scene to play. Maybe I'd show up to the headquarters." After PR 8453, joining writes a party-joined record naming the party, its office and its leader, and Travel lists the office for members, but no scene plays and no journal line tells it, because the record has no situation type and no lines. Seen: Politics, Parties, Join, then the welcome scene at the party office with its leader named, and a Journal line for the day.

**Cause.** Found in code: joinParty in src/core2/modules/parties.ts (line 482, the api.emit of PARTY_JOINED) writes party-joined with personIds [player, leader] and facts partyId, party, organizationId (PR 8453); src/director/data/situation-types.json and circumstances.json hold no type or circumstance whose cause matches cause:event:party-joined, and data/english/parts holds no lines for one. Stopgap SG-PLAY-party-joined-scene-awaits-words.

**Fix.** Words first: the words session writes the leader's welcome (what the party stands for here, the next party meeting from its party-meeting records), the player's replies (a pledge to help, a quiet thanks) and the journal line. Then a builder wires the cause by the scene-producers skill: an eventImpacts row for party-joined, a situation type bound to the subject (the player) and the counterpart (the leader), set at the party office (membership:political-party, the campaign storefront picture), and checks with purposeScene that it is worded before it can stop the player. Delete the stopgap.

**Time box.** 4 hours

**Rules.** Scene standard: the scene writes something back (the reply record). No hand-written player text. One record, one scene. Wire to the world: the party's next meeting reads the new member.

**Done when.** A second session makes a new adult life in a drawn place (place and seed named), opens Politics, Parties, clicks Join: a scene plays at the party's office with its leader by name and ends with a reply record (id named); the Journal holds a line for the day; screenshots at 1440 by 900.

**Waits on.** The words session's lines for the welcome, the replies and the journal line (listed in PR 8453).

**Files.** src/director/data/director.json, src/director/data/situation-types.json, data/english/parts/scene-words.json, data/english/parts/scene-talk.json

**Notes.** Split from play-join-a-party-has-no-scene-and-no-headquarters by its builder (opus-1fd7, Nov 11): the record, the opening and Travel landed there; the scene waits on words.
