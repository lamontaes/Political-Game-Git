---
id: words-phone-answer-names-the-caller
title: "A phone answer shows the caller's name and face in the talk box"
area: words
lead: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: low
root: none
source: "Words lead, Nov 16, on #9256 at 37b75c18 (the played file's Name in the box column)"
checked:
---

**What.** When someone answers the player by phone (the answer to Ask out or Propose when the two are not in one room), the talk box shows the lines with no name and no picture, so the player cannot tell who is speaking. The same answer in person names the speaker. Seen: the talk box over a phone answer to Ask out or Propose, with the caller's name and face above the line.

**Cause.** Found in code: `storyScene` in src/bench/story.ts builds `names` only from `cast`, which is the player plus `scene.presentIds` (the people in the room). A person answering by phone is not in the room, so `story.names[talk.askerId]` is undefined, and `playExchange` in src/bench/play.mjs calls `setWho(talk.askerId, undefined)`, which empties `talk-name` and hides `talk-who`. Measured: the seven walks behind /mnt/project-files/words-lead/family-life/card-9256/played-37b75c18f5748aebbbaac5de4dd896ab0cc7bf6f.md, for example walk b-2 (Belmont NH, seed 0fc7a66e-2d7c-43f8-a387-5d57d7909abf) line 36, "I was hoping you'd ask.", with an empty name, while walk a-1 (Bridgeville DE, in person) names Daniel Conway.

**Fix.** In storyScene, add the scene's `talk.askerId` (and `talkToId`) to `names` when they are not in the cast, named the way the cast is named, without adding them to the room's people. setWho already fetches the face of someone not on the strip from /api/known, so the picture follows the name. Never draw a caller standing in the room.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Replace, never layer: the empty name is fixed in storyScene itself, and the name is read from the same person record the cast reads, with no second naming path. Standing rule player-screen-text: the box shows a worded name only, never an id.

**Done when.** At a drawn place and seed, a second session plays a new life, asks someone out by phone with Ask out on their People card, and sees the answer's lines under that person's name with their face in the talk box, while the room's strip does not gain them; a test in src/bench is red without the change and green with it.

**Waits on.** Nothing.

**Files.** src/bench/story.ts, src/bench/play.mjs

**Notes.** Filed Nov 16 on its own branch beside #9256, which is stamped and was not changed for it.
