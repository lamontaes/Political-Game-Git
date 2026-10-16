---
id: words-scene-cause-person-birth
title: "The scene narration names a birth as the cause of a gathering"
area: words
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A birth in the household now stages a gathering scene for each parent (pool item core-unread-renewal-births-plans), but the scene's opening paragraph has no sentence for its cause, so it says nothing about the birth. The cause label feeling:event:person-birth is not in the causes list of `src/director/data/scene-rows.json`, and the scene-words bank (`data/english/parts/scene-words.json`) has no row for it. Add the label to the list and have the civic-prose process author the bank sentences from the birth's fact packet (the parent, the child, the date). The player would notice the gathering scene opening with why everyone is there.

**Rules.** No hand-written player text: the sentences come from the civic-prose authoring process and the English bank, never typed into code. American English everywhere: the bank passes the spelling sweep. Ask why: the sentence cites only the birth record's own facts. Research before building: the grounding reviewer checks each sentence against its packet.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56 and a seed the builder did not choose, both named in the PR body) the scene scheduled for a parent from a birth record id opens with a sentence naming the birth, a test in src/director/birth-scenes.test.ts reads that sentence by the birth record id, and the grading pass (words batch) lists the new bank rows.

**Files.** src/director/data/scene-rows.json, data/english/parts/scene-words.json, src/director/birth-scenes.test.ts

**Notes.** Split from core-unread-renewal-births-plans. A cause the bank has no sentence for is left out of the narration by design, so the scene works today without the sentence.
