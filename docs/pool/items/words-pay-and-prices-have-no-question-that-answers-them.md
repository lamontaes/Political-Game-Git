---
id: words-pay-and-prices-have-no-question-that-answers-them
title: "A hurt address cannot open on pay or prices, because no bill question answers them"
area: director
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
root: rc4-hand-written-words
source: Words lead, Nov 14, 2026, ruling on the governor and mayor jobs, pay and prices lines (Speeches builder D)
checked:
---

**What.** A governor or mayor whose term left pay or prices worse never opens a crisis or combative address on it, however far it went; the address opens on jobs or on the speaker's own issues instead. Seen: in Bee Cave, Texas (seed a7c13e) with jobs, pay and prices all sliding, the governor's address states jobs and says nothing of prices (the worst slide, minus 1) or pay.

**Cause.** Found in code: `conditionsByWorst` in `src/director/speech-outline.ts` lists prices and pay first, but the draft is taken only for a topic `responseOf` can answer from the speaker's stands, and `answerTopics` in `src/director/data/speech-outlines.json` has rows for rent, crime, schools, health, roads and environment only; no bill-catalog question is named as answering pay or prices, so `responseOf(core, person.id, stands, "prices")` is empty (probe: prices answered false, jobs answered true).

**Fix.** Add `pay` and `prices` rows to `answerTopics` naming the catalog subjects whose questions bear on them (the existing `topicsBySubject` rows for labor and for the cost of living), checked by reading composed addresses; a hurt address of a governor or mayor then opens on pay or prices where the speaker holds a stand on one. The player sees it in the governor's and mayor's address at home.

**Time box.** 2 hours, Sonnet.

**Rules.** No hand-written player text: the opening line is the bank's, placed by its fact. No dice: which condition opens the address follows the measured slide and the speaker's stands. One rule, all 56 places: the rows name catalog subjects, never a place.

**Done when.** In three drawn places with prices sliding hardest, a governor who holds a stand answering prices opens their address on prices. A second session reads one such address on main.

**Waits on.** Nothing.

**Files.** src/director/data/speech-outlines.json, src/director/speech-outline.ts (read), src/director/local-address.test.ts

**Notes.** Filed by the Speeches builder (D), from the finding behind the jobs, pay and prices lines (/mnt/project-files/words-lead/8878/lines-local-work-pay-prices.md).

**Resolved.** The term read's one map (areas.json `answeredBy`) now names the questions and budget lines that answer jobs, pay and prices, so a hurt address of a governor opens on pay and prices, and a mayor's on pay; PR 1 of the town-level jobs, pay and prices work. What a town still lacks is `core-town-wage-and-price-questions`.
