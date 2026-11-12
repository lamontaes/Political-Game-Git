---
id: standin-recall-promised-against-from-platform
title: "A recall organizer says a member promised to vote the other way only when the member's filed platform did"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: words
standard: 2
model: sonnet
effort: medium
root: design-story-director
---

**What.** At the recall table the organizer's line that the member voted for the bill "after telling us you wouldn't", and the member's two answers, never play, because nothing sets the scene fact `promised-against`. The organizer names only the vote. Stand-in SG-WORDS-recall-promise-record. Seen: in the recall organizer's words to the player.

**Cause.** Found in code: src/director/purpose-scene.ts line 1164 (the comment carrying SG-WORDS-recall-promise-record) is where the recall scene's facts are built and `promised-against` is never set; the bank lines that need it are in data/english/parts/scene-talk.json (requiresFacts promised-against). The record that would hold the promise exists: a filing's platform (stance strings `question=-1`, parsed by parsePlatform, src/core2/modules/campaigns.ts line 563) and the legislature's vote on the bill's question.

**Fix.** In purpose-scene.ts, where the recall petition's facts are built, find the filing the member last won their seat on (the campaigns engine's filing for that seat) and read its platform with parsePlatform; when it holds a stance against the question of the bill the petition is about (the bill id is on the petition and the member's yes vote is on the legislature's record), set `promised-against` with sourceRecordIds naming the filing id and the vote record id. When the platform is silent or agrees, set nothing (the organizer keeps naming only the vote). Resolve SG-WORDS-recall-promise-record in src/director/data/stopgaps.json and delete the comment.

**Time box.** 3 hours for one Sonnet session. It stays cheap because it reads one filing and one vote when a recall scene is composed, never on a day tick.

**Rules.** Ask why: a broken promise is said only where a record holds the promise (the filed platform), citing its id. No dice: the platform and the vote decide, never a roll. One rule, all 56 places: no place named in logic. No hand-written player text: the lines already exist in the bank.

**Done when.** A second session plays buildBenchWorld in a drawn place (place and seed named) until a recall petition names a member whose filed platform stood against the bill's question, opens the petition scene and sees the organizer say the promise line with the filing record id in its facts, and in a place where the platform was silent sees no line claiming a promise. src/director/recall-answer.test.ts passes on both cases.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/core2/modules/campaigns.ts, src/core2/modules/recalls.ts, src/director/recall-answer.test.ts, src/director/data/stopgaps.json
