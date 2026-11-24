---
id: words-not-while-i-m-in-the-dorm
title: "A couple who live in a room say why they are not moving in together"
area: director
kind: feature
priority: 3
size: S
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
source: account lead thread, Nov 14, with #9252 (the coordinator's ruling: no new line in that pull request, a visible answer later)
---

**What.** While either of a couple lives in a dorm, barracks or other room, nobody asks the player to live together, and nobody moves in (#9252). The player sees a partner who never raises it. A person in that spot would say so, in words like "not while I'm in the dorm". Seen: the talk with a partner when the couple are past the dating stage and one of them lives in a room.

**Cause.** Found in code: `movingOrder` in `src/core2/modules/partnerships.ts` returns nothing while either of the couple is in a room, so the move-in question is never asked and the couple stays at dating with no scene.

**Fix.** A scene or talk piece, played from that same check, in which the partner or the player says they cannot move in while they live in the room, worded by trait and without a figure, through the English engine's banks.

**Time box.** 3 hours, Opus.

**Rules.** No hand-written player text in code; people say how it feels, never the figure; the line is tied to the world by a fact (the room), not by padding.

**Done when.** In three drawn places, each a played world where the player or their partner lives in a room, a test composes the piece from the record that `movingOrder` read, and a second session, on main, plays a life in a dorm with a partner and sees the line in a talk.

**Waits on.** #9252.

**Files.** src/director/, data/english/parts/, src/core2/modules/partnerships.ts

**Notes.** Filed by hand by the group-quarters thread.
