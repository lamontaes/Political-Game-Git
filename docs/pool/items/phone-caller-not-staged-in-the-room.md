---
id: phone-caller-not-staged-in-the-room
title: "A phone call or letter scene stands the caller in the player's room"
area: director
kind: bug
priority: 3
size: S
status: claimed
standard: 2
claimed-by: claude/pt-carryover-n16-44
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: Carryover screens, Nov 23 sitting (N16-44)
---

**What.** From the Nov 16 recording: in a scene whose setting is a call, the caller stands in the player's room, beside them. A call and a letter are between two people who are not in one room.
Seen: Nov 23, by reading the code. Not yet seen in a played call.

**Cause.** Found in code: the story builder in src/bench/story.ts (the `people:` line of the returned story, `peopleHere(core, backdrop.file, cast)`) stages every person in the scene's cast, whatever its setting; the `phone` setting (data `sceneSettings.phone` in src/bench/data/scene-places.json) draws the player's own home, so the caller appears in it.

**Fix.** For a scene whose setting is `phone` or `letter`, only the player is staged; the caller stays in `names`, `talkToId` and `talk.askerId`, so their lines and name are unchanged. No player text changes; the director is not touched.

**Time box.** 1 hour, one Sonnet session at medium.

**Rules.** Wire to the world: the rule is one check on the setting kind in the one story builder, so every call and letter scene gets it, and it adds no player text.

**Done when.** In a drawn place at 1440x900, a played call scene (for example a person who lost their job calling to ask for a word) shows only the player on the strip, the caller named in the talk. A second session plays one in the running game and sees no caller beside the player.

**Waits on.** Nothing.

**Files.** src/bench/story.ts

**Notes.**
