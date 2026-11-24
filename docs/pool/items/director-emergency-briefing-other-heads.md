---
id: director-emergency-briefing-other-heads
title: "The other cabinet heads join the governor's disaster briefing and speak in it"
area: director
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: governor's briefing room builder, Nov 15; Account lead ruling: cast only the people who speak
lead: words-engine
claimed-at:
---

**What.** The governor's disaster briefing (`emergency-briefing`) seats only the lead department's head, because a scene cannot give a second person in the room a turn yet. The map in `src/core2/data/executive/emergency.json` (`briefing.rows`) already names every head a disaster touches, in order. When a scene can carry more than one speaker besides the player, seat the rest of those heads and let each say what their department's records show of the disaster. Seen: a governor's disaster briefing with every head the map names for its type in the room, each speaking.

**Cause.** Found in code: `src/director/civic-roles.ts` fill `emergency-lead` returns the first holder from `emergencyHeadsOf`; a second fill `emergency-heads` was written and removed in the briefing PR because the scene machinery gives one non-player role speaking turns in the arc (`src/director/purpose-scene.ts` `purposeScene`, `src/director/scene-talk.ts`). The several-speakers machinery is pool item director-scene-several-speakers-at-one-table.

**Fix.** Add the `heads` role back to the `emergency-briefing` type in `src/director/data/situation-types.json` with an `emergency-heads` fill in `src/director/civic-roles.ts` (the holders of the map's posts after the lead, living and not the player), once `purposeScene` composes turns for more than one non-player role. The player sees each head in the governor's office picture say their department's part before the player answers.

**Time box.** 4 hours for one Opus session after the multi-speaker work lands. When it runs out, push what passes and say so. Seen: a storm briefing with two or more heads each speaking.

**Rules.** No dice. Wire to the world: another engine reads what is written. One rule, all 56 places: no place is named in logic.

**Done when.** A second session, on main at a drawn place and a seed the builder did not choose, plays a governor through a disaster and sees every head the map names for its type speak, by record id of the offered record, and the declaration still settles through `answerEmergencyBriefing`. A test in `src/director/emergency-briefing.test.ts` fails when a map head is missing from the room.

**Waits on.** director-scene-several-speakers-at-one-table.

**Files.** src/director/civic-roles.ts, src/director/data/situation-types.json, src/director/purpose-scene.ts, src/director/emergency-briefing.test.ts, data/english/parts/scene-talk.json (Words lead writes any lines)

**Notes.** Nov 15. Words lead writes the lines for the added speakers; the builder lists the pieces it needs.
