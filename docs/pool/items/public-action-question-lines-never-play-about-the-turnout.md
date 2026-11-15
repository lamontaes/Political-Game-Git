---
id: public-action-question-lines-never-play-about-the-turnout
title: "Two lines that ask the player whether a protest's turnout changes anything never play, so they came out"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words-engine
model: sonnet
effort: medium
root: none
source: Account lead, #9418 played file, Nov 15
claimed-at:
---

**What.** The two "state-ask" lines "A few people came out about {issue}. Does that change anything for you?" and "People came out about {issue}. Does that change anything for you?" were written for a protest scene and shipped nowhere: at seven places and seeds (Port O'Connor, Lincoln, Curdsville, Roanoke, Lake Meade, Corwin, Cottleville) the protest scene is told by the asker's statement ("Look how many of us came out. What are you going to do about X?") and neither question was ever chosen. Both were deleted from `data/english/parts/scene-talk.json` in #9418. Seen: in the played files for #9418, no protest scene at any of those places asks the question.

**Cause.** Found in code: in `src/director/purpose-scene.ts` the action-confront scene opens with its asker statement, which already carries `issue`, `protest` and a turnout fact, so a second state step that asks about the turnout has no moment in the scene to be said in.

**Fix.** Decide with the Words lead where, in a protest that the host has answered and the asker presses again, a turnout-led question belongs (a second round of the same scene), build that step in the scene's tree, and write the two lines there.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** No hand-written player text in code; people say how it feels, never the figure; a line that cannot be shown played does not ship.

**Done when.** At a named place and seed a protest scene plays the question at a few and at a crowd, shown in a played file headed with the sha; a second session replays it in a drawn place and seed nobody chose.

**Waits on.** #9418.

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts
