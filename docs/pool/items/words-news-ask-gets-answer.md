---
id: words-news-ask-gets-answer
title: "A question the player asks after family news gets an answer from the record"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** After a relative's hard news, the player can reply with a question: "For how long?" after a prison sentence, "What did the doctors say?" or "How long has {name} been sick?" after an illness. No tell follows those replies in conversation-rules.json, so the one who brought the news answers with an acknowledgment instead of an answer. The records hold the answers: the sentence's term on the justice record, the diagnosis and its date on the health record. #6130 adds the same kind of question after a move away ("Where did they go?"), whose answer is the departure record's destination.

**Rules.** Words engine: the director picks the subject from records and the English engine says it, so every question offered has an answer the next line gives. Wire to the world: each answer reads the record the news came from (justice, health, moves) and cites it. One rule, all 56 places.

**Done when.** In a drawn place (seed named), a played-world test opens every family-news talk the director stages for a watched household over a year and picks each reply that asks; the next line is the bearer's answer from the news record, cited by record id, never an acknowledgment, for prison, illness and move-away news.

**Files.** src/director/data/conversation-rules.json, src/director/conversation.ts, data/english/parts/conversation.json

**Notes.** TODO
