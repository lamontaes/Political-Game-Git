---
id: words-player-speech-through-planner
title: "The player's own campaign and floor speeches are planned by the one speech planner from the stances and parts they choose"
area: words
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: words builder, Nov 12 (PR 8878)
lead: words
standard: 2
model: opus
effort: medium
root: none
---

**What.** Every other speaker's address, floor speech and campaign speech now comes out of the one outline planner (src/director/speech-outline.ts `planSpeech`): one theme, each point context, belief and ask, one pole, said by the English engine. The player's own campaign speech is still the stage builder's four picked parts (src/director/speech-builder.ts, owner rulings Oct 14 and Oct 15: built as it is given, one part at a time), each part said on its own, so the player's speech has no theme or ask joining its parts; and a player who sits on a town body has no floor speech of their own (the floor-debate scene casts only the two members `recordFloorDebate` names). Seen: a player's speech reads with one theme and asks for the vote, from the stands they chose.

**Cause.** Found in code: src/bench/handler.ts `/api/campaign/speech/pick` and `/give` read `speechStagePieces` and `wordSpeechPart` (src/english/speech-stage-words.ts) part by part; nothing hands the chosen subjects to `planSpeech`. src/director/local-speeches.ts `composeFloorSpeech` takes any member, but no screen offers the player the floor. SG-WORDS-player-speech-not-planned marks it.

**Fix.** Keep the stage choice (the owner's ruling): each stage offers the planner's points for the player's stands (`standsOfPerson` on the player, `contestPositions` for the race), the pick sets the plan's theme and points, and `/give` composes the speech with `composeBlocks` from the plan as `composeCampaignSpeech` does. On a town body's floor day, offer the player the floor and compose `composeFloorSpeech(core, billId, playerId)`. Delete `wordSpeechPart` and the stage pieces it alone reads. Clear SG-WORDS-player-speech-not-planned.

**Time box.** 4 hours.

**Rules.** Replace, never layer: the stage words that only the old path read are deleted in the same change. No hand-written player text.

**Done when.** A second session plays a new life in a drawn place to a campaign, gives a speech through the Speech card and reads one theme and an ask in what is said; and, seated on a town body, rises on a pending ordinance and hears their own floor speech.

**Waits on.** Nothing.

**Files.** src/director/speech-builder.ts, src/english/speech-stage-words.ts, src/bench/handler.ts, src/director/local-speeches.ts
