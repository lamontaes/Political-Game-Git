---
id: director-floor-speech-scene-plays-the-day-after-the-vote
title: "The floor speech 'before the roll' plays the morning after the meeting already voted"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: medium
root: rc6-scenes-repeat
source: "Account lead T25 playtest, Nov 13, 2026 (Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71)"
checked:
claimed-at:
---

**What.** The council meets at 6 PM and the player votes every item (Budget Ordinance 2025-1 enacted 3 to 2). The next morning at 8:00 AM a scene opens with Vivian Harvey: 'Thank you, Chair. I cannot support Ordinance 2025-1, and I'll say why', with replies 'I'll be voting with the member' and 'Will the member yield for a question?'. The vote is over. It happened the morning after every one of eleven meetings from Feb to Nov 2025. Seen: the 8:00 AM scene the day after each council meeting.

**Cause.** Found in code: recordFloorDebate in src/core2/modules/legislature.ts (line 3940) emits the floor-debate record when the roll is taken, and the director stages the floor-debate situation (src/director/data/situation-types.json, key floor-debate) from that record for a later day, so it plays after the meeting it belongs to has closed. Measured: Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train branch c39bbb71 (Account lead T25, Nov 13, 2026); Advanced start as Quinn Pugh, the floor-debate record of Ordinance 2025-1, enacted at the Feb 4, 2025 meeting, played as a scene at 8:00 AM on Feb 5.

**Fix.** Play the floor debate inside the meeting, at the item's take-up and before the player's press, when the player sits on the body. When the player does not sit there, do not stage it as a scene. A floor-debate scene whose bill is already decided is not staged. Add a test: a seated player's meeting holds the floor speech before the roll, and nothing about the bill's floor plays the next day.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** A scene exists only if it writes something back and its cause still stands (scene-standard). Sliding scales and causes: the speech scene plays only while its vote is still to come.

**Done when.** A second session plays a seated local member on main in a drawn place, named with its seed, through two meetings and sees each floor speech before the vote it argues, and no floor speech the day after.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/director/data/situation-types.json, src/director/purpose-scene.ts
