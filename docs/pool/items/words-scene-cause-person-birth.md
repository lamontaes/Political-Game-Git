---
id: words-scene-cause-person-birth
title: "The scene narration names a birth as the cause of a gathering"
area: words
kind: feature
priority: 3
size: S
status: done
claimed-by: claude/scene-cause-person-birth
pr: #4954
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T17:25:41.074Z
---

**What.** A birth in the household now stages a gathering scene for each parent (pool item core-unread-renewal-births-plans), but the scene's opening paragraph has no sentence for its cause, so it says nothing about the birth. The cause label feeling:event:person-birth is not in the causes list of `src/director/data/scene-rows.json`, and the scene-words bank (`data/english/parts/scene-words.json`) has no row for it. Add the label to the list and have the civic-prose process author the bank sentences from the birth's fact packet (the parent, the child, the date). The player would notice the gathering scene opening with why everyone is there.

**Rules.** No hand-written player text: the sentences come from the civic-prose authoring process and the English bank, never typed into code. American English everywhere: the bank passes the spelling sweep. Ask why: the sentence cites only the birth record's own facts. Research before building: the grounding reviewer checks each sentence against its packet.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56 and a seed the builder did not choose, both named in the PR body) the scene scheduled for a parent from a birth record id opens with a sentence naming the birth, a test in src/director/birth-scenes.test.ts reads that sentence by the birth record id, and the grading pass (words batch) lists the new bank rows.

**Files.** src/director/data/scene-rows.json, data/english/parts/scene-words.json, src/director/birth-scenes.test.ts

**Notes.** Split from core-unread-renewal-births-plans. A cause the bank has no sentence for is left out of the narration by design, so the scene works today without the sentence.

Built Oct 17 (claude/scene-cause-person-birth). The cause label `feeling:event:person-birth` is in `src/director/data/scene-rows.json`; `data/english/parts/scene-words.json` has four authored rows (author Claude director line, civic-prose, dated 2026-10-17): `cause-birth-self` "You have a new baby." and "Your baby has been born." (said when no one else is bound) and `cause-birth-other` "{other} has been born." and "{other} was born." (the counterpart of a birth moment is the baby, so the slot renders as "your son", "your daughter"). My first draft of the other rows, "You and {other} have a new baby.", read "You and your son have a new baby" in Camp Hill, Alabama (seed 943ffc906cb2cf5f4dba9cddb23f9bef0f005679:1), which is why the counterpart is the baby and not the other parent. Grounding review (civic-prose-grounding-reviewer, run on the fact packet alone, it did not open the source files): PASS. The test in `src/director/birth-scenes.test.ts` now composes the parent's scene and checks the sentence and the birth record id in its sources: Juliaetta, Idaho (seed 20630e1e56e51e22a27dafc390a5a36809d9e590:0) reads "Your son has been born." It also now picks the parent's own scene; before, a relative's gathering could be chosen and the test failed on a random draw. Editorial review by the owner of the new lines is the open step (the civic-prose skill sends each new line to him with its supporting facts); the grading pass will list the rows.
