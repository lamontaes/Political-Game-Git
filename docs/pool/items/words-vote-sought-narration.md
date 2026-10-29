---
id: words-vote-sought-narration
title: "Narration for the player asking a colleague for their vote the evening before the roll"
area: words
kind: feature
priority: 2
size: S
status: claimed
claimed-by: words/vote-sought-narration
pr:
blocked-on:
lead: words
source: added with npm run pool -- add
claimed-at: 2026-10-29T06:39:08.071Z
---

**What.** The new vote-sought scene (src/director/ask-talk.ts) lets the player ask a colleague for their vote the evening before the floor vote on the player's own bill. It reuses the ask-vote purpose's lines with the speakers turned around, so the request, plea, trade, press and thanks are the player's and the yes, not-yet and no are the colleague's. The one piece it lacks is its setup: every ask-vote narration is written as the colleague coming to the player ("{name} knocks on the open door"), so vote-sought plays with no narration of its own.

**Rules.** No hand-written player text in code: the narration is a bank piece in data/english/parts/scene-talk.json with a use for step narrate, role narrator, purpose ask-vote and key vote-sought. Slots: {name} is the player, {first} the colleague, {bill} the bill as a clerk reads it. Scene standard: the narration sets the evening before the vote and never restates what the talk then says.

**Done when.** In a played world (buildBenchWorld) in a drawn place with the seed named, src/director/player-asks-for-a-vote.test.ts shows the vote-sought talk opening on a narrate line from the bank for key vote-sought, and the scene-talk tests compose it in full, with at least three narration pieces so a player meets more than one.

**Files.** data/english/parts/scene-talk.json, src/director/ask-talk.ts (narration step), src/director/player-asks-for-a-vote.test.ts

**Notes.** TODO
