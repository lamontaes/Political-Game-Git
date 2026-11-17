---
id: play-party-invites-the-player-to-its-meetings
title: "A player who joins a party is never asked to its meetings, and the meeting decides by the player's lean whether they go"
area: play
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/blockers-party-committee
pr: #9814
after:
blocked-on:
lead: governing
model: fable
effort: medium
root: rc10-screens-keep-own-facts
source: owner's play of v0.112.0, Nov 16, 2026 ("I can't run for anything"; Desk answer "Work for someone else's campaign, a party committee or an appointed board until a race opens"), crew list issue 9747 item 3a, Story's records list item 2
checked:
---

**What.** A player with no race open can join a party, but the party never asks them to its monthly committee meeting. Worse, the meeting itself decides by the player's lean whether they come, so the game chooses for the player. The owner's answer for the first year is to work on a party committee.
Seen: Beesleys Point, New Jersey (seed 1c0c38ab-cccf-45f2-943d-b108847e2981), nothing on day one to do in politics.

**Cause.** Found in code: src/core2/modules/parties.ts `meetTheChair` weighs every member with `leanedYes`, the player included, and no record invites the player or keeps their answer.

**Fix.**

1. The committee's next meeting day is kept (`schedule`), and the player who joins, or who is a member when the next meeting is set, is invited through a `party-meeting-invited` record.
2. Their reply in the scene is kept (`playerAttends`), and the meeting puts the player in the room only by their own yes.
3. The reply moves move to `src/core2/scene-replies.ts` so the parties engine reads them without a cycle through press.
4. Story writes the `party-meeting-invite` scene.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: the player's attendance is their own reply in a scene, never their lean read for them.

**Done when.** A second session plays a drawn place it writes down with its seed, joins a party from Politics, is asked to the next committee meeting in a scene, says yes, and on that day the meeting's record has the player in the room.

**Waits on.** Story's `party-meeting-invite` scene.

**Files.** src/core2/modules/parties.ts, src/core2/scene-replies.ts (new), src/core2/modules/press.ts, src/core2/modules/parties-player-meeting.test.ts (new), src/core2/data/opening/day-zero.json

**Notes.** Filed and built by the Blockers lane, Nov 17. Replaces the plan in #9744 for this road. The opening skip at parties.ts `openParties` stays: the owner ruled on Nov 8 that the player chooses their own party.
