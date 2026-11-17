---
id: director-rival-message-says-nice-speech-to-a-player-who-gave-none
title: "A rival does not praise or call false a speech the player never gave"
area: director
kind: bug
priority: 1
size: S
status: dropped
claimed-by:
blocked-on:
after:
source: A player's play at Western, Nebraska (seed life29), reported by the Account lead, Nov 15
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** A rival said "Nice speech. Too bad none of it was true." to a player who had given no speech and held no rally.
The rival's line was opened by the rival's own paid message, so nothing the player said was on record.
Seen: Western, Nebraska, seed life29, a player's own play.

**Cause.** Found in code: the rival-message row in src/director/data/circumstances.json plays the rally-opponent type, whose opener "Nice speech. Too bad none of it was true." in data/english/parts/scene-talk.json had no required fact, so it served the rival-message cause, which records only the rival's message; only the debate cause records the player standing on a stage, and the sibling opener "Nice answers up there" already requires `debate`.

**Fix.** Delete the opener, because neither cause records a speech or rally of the player's for it to read as a gate. Its pairs lose their verdicts with it. The pinned test src/director/rally-opponent-lines.test.ts fails on any rally-opponent opener that names a speech, a stage or the player's answers without the `debate` fact.

**Time box.** 2 hours for a Sonnet session.

**Rules.** Replace, never layer: the opener is deleted, not kept beside a gate it cannot meet. No hand-written player text in code: the words stay in the bank.

**Done when.** A second session sees, in the running game at a place drawn from all 56 (name the place and seed), that a player who filed and gave no speech never hears a rival speak of a speech. The test src/director/rally-opponent-lines.test.ts passes, and it fails with the opener back.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json

**Notes.** Filed Nov 15 by hand with its pull request. The builder could not rebuild the Western world as the report names it (the start date and filing there are not in the report), so the red is shown on the bank and the player's world is for the second reader.

- Nov 17, story-cut-deleted-scene-kinds: src/director/rally-opponent-lines.test.ts deleted with its scene kind (owner, Nov 17: "DELETE EVERYTHING THAT IT HASNT WRITTEN"). Dropped: the scene kind this item serves is deleted.
