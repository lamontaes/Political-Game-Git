---
id: words-addresses-are-scenes-with-ties
title: "The President's and local addresses are a separate pipeline that states contested claims as fact"
area: play
kind: wiring
priority: 1
size: L
status: in-pr
standard: 2
claimed-by: desk thread (claude/project-thread-hkqdh2-address-scene)
pr: 9663
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Owner, Nov 16 04:18Z ("the opening speech is pretty awful ... why does the opening stuff seem to not take from the English engine") and 05:03Z (the English repairs finished overnight), through the lead
---

**What.** The President's opening address and the governor's and mayor's addresses are composed once at world load by their own path (`planSpeech` in src/director/speech-outline.ts, then `composeAddress`), kept as text on the address record, and the "address" scene only plays that text back. A piece states a contested premise as fact with no tie to the player's town or household. Seen: Discovery Harbour, Hawaii (1505900), run addr-a, `drawPlace("addr-a", "address-now")`: "Why would we change course, when power plants burn what keeps the lights on cheaply?"

**Cause.** Found in code: src/director/opening-story.ts `composeBlocks`, src/director/local-address.ts `composeLocalAddress` and src/director/local-speeches.ts compose the address outside the scene engine and store `ADDRESS_FACT.text` and `parts` (src/director/opening-facts.ts); src/director/scene.ts plays them back as a speech. The bank's uses (data/english/parts/opening-speech.json, 3,329 pieces) declare the facts they need but not what their claim rests on, so nothing tells a speaker's view from a record's fact.

**Fix.** Lead-approved plan, Nov 16 05:04Z. Four small PRs:

1. The tie vocabulary on `PartUse` in src/english/bank-parts.ts: `tie` with the values stand, place, law, record and frame, agreed with the conversation engine thread.
2. Every use in the address banks declares its tie. A guard refuses a claim with no tie, or a slot that comes from no record. A piece that works only as a flat fact with no record behind it is deleted, and its text goes on an item.
3. The address situation type gets four beats in data: open (frame); stand (said as the speaker's view, from their stand record); reach (what the question is in the player's town or household, from a record); ask (the law in force or the bill asked for). The scene engine composes them when the scene plays, and `planSpeech` stays as the planner.
4. Delete the parallel compose path and the stored text, and add a dev view that shows why each part was chosen.

**Time box.** One night, one Opus session at medium effort.

**Rules.** Words come from the banks; a contested premise is the speaker's view; every effect is traceable in dev mode; replace, never layer.

**Done when.** Addresses are played at three places, by at least two parties and at two levels (the President and a local official), and read by the Words lead or the second reader at each PR's head. No address sentence states a contested premise as fact. Each part's tie and its record show in dev mode. The old compose path is gone.

**Files.** src/english/bank-parts.ts, data/english/parts/opening-speech.json, src/director/speech-outline.ts, src/director/opening-story.ts, src/director/local-address.ts, src/director/local-speeches.ts, src/director/scene.ts, src/director/data/situation-types.json, src/bench/dev-views/address-parts.ts (new)
