---
id: words-tenure-under-two-years
title: "A tenure under two years has no line, and five 'since {month year}' pieces no longer fit"
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

**What.** Conversations now say a work tenure as whole years, and only from two years up (words/grading-bench-handler): nobody says the month they started. Someone at a job under two years has no tenure line, so that answer is not offered. The five bank pieces worded 'since {since}' (conversation.own-work-answer-since._-since, tenure-reply-reply-since.i-started-in-since, tenure-reply-answer-own._-my-since) no longer fit any fact.

**Rules.** No hand-written player text: the short-tenure lines come from the bank by civic-prose ("I just started.", "About a year now."), and the five date pieces are retired in the bank regeneration, not hand-edited.

**Done when.** A played-world test in a drawn place shows a player with under two years at a job answering how long they have worked there with a bank piece, and the bank holds no piece with a {since} slot.

**Files.** data/english/parts/conversation.json, scripts/english-corpus/, src/director/conversation.ts

**Notes.** TODO
