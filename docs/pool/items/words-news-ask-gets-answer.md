---
id: words-news-ask-gets-answer
title: "A question the player asks after family news gets an answer from the record"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr: #8431
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: sonnet
effort: medium
root: rc3-thin-life-record
lead: words
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-words-news-ask-gets-answer
---

**What.** After a relative's hard news, the player can reply with a question: "For how long?" after a prison sentence, "What did the doctors say?" or "How long has {name} been sick?" after an illness. No tell follows those replies in conversation-rules.json, so the one who brought the news answers with an acknowledgment instead of an answer. The records hold the answers: the sentence's term on the justice record, the diagnosis and its date on the health record. #6130 adds the same kind of question after a move away ("Where did they go?"), whose answer is the departure record's destination.

**Cause.** Found in code: the "tells" table in src/director/data/conversation-rules.json (line 158) has entries for job-lost, eviction, address and job-new replies and none for the prison-news, illness-news or departure replies, so a question asked after that news ("For how long?", "What did the doctors say?", "Where did they go?") gets an acknowledgment instead of an answer.

**Fix.** Add tells so the bearer of family news answers from the record the news came from (the sentence on the justice record, the diagnosis and date on the health record, the destination on the departure record), citing the record id. This also covers the prison-news talk of words-justice-imprisoned-talk.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Words engine: the director picks the subject from records and the English engine says it, so every question offered has an answer the next line gives. Wire to the world: each answer reads the record the news came from (justice, health, moves) and cites it. One rule, all 56 places.

**Done when.** A second session, not the builder, runs a played-world test in a drawn place (seed named) that opens every family-news talk the director stages for a watched household over a year and picks each reply that asks, and sees that the next line is the bearer's answer from the news record, cited by record id, never an acknowledgment, for prison, illness and move-away news.

**Waits on.** Nothing for the build: add all three tells now. Only the played proof of the illness half waits on health-serious-illness-onsets-in-play (open); until it lands, prove the illness tell with a test that builds the news from a health record, and say so in the pull request.

**Files.** src/director/data/conversation-rules.json, src/director/conversation.ts, data/english/parts/conversation.json

**Notes.** TODO

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:22 UTC) on branch claude/pool-words-news-ask-gets-answer.

Released by next (2026-11-11): no push to claude/pool-words-news-ask-gets-answer since 2026-11-11 01:22 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-words-news-ask-gets-answer and pull request #8431.
