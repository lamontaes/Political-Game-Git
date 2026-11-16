---
id: words-floor-campaign-speeches-said-from-record
title: "Floor and campaign speeches are composed when their scene plays, so the words can change after the speech was given"
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
lead: words
model: sonnet
effort: medium
root: none
source: Desk, Nov 16, the lead's ruling on addresses as their record (words-addresses-are-scenes-with-ties step 4)
---

**What.** A council member's floor speech and a candidate's campaign speech are composed from the world when their scene opens, not on the day they were given, and nothing keeps what was said. Today only the scene reads them, so no paper, rival or promise can quote one after the fact.
Seen: in code at the address step-4 head, src/director/scene.ts is the only caller of `speechOfRecord`; no record keeps a floor or campaign speech's words.

**Cause.** Found in code: src/director/local-speeches.ts `speechOfRecord` calls `composeFloorSpeech` and `composeCampaignSpeech` with the world as it is when the scene is composed, so a stand, a name or a bill that changed after the floor debate or the stump speech changes the words; the address had the same fault until it kept its sentences on its record (src/director/address-render.ts).

**Fix.** Compose each once, on the day of its record (the floor-debate record, the speech-heard record), keep it on that record with `saidFact` (address-render.ts), and have the scene and any later reader say it through `addressPartsOf`/`sentenceText`, the one renderer; delete the scene-time compose.

**Time box.** 2 hours, one Sonnet session at medium effort.

**Rules.** Ask why: what a speech said is read from the record of the day it was given, never recomposed later from a world that moved on.

**Done when.** In a drawn place with a seed nobody chose, a floor speech heard in its scene is said the same when its record is read a month later, and a second session sees it in the running game with dev mode's "Why each line" listing it.

**Waits on.** Nothing.

**Files.** src/director/local-speeches.ts, src/director/scene.ts, src/director/address-render.ts
