---
id: words-questions-answered-by-fitting-replies
title: "A question in everyday talk is answered by the replies that answer it"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: lane3/everyday-answers
pr: #7196
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T06:56:18.537Z
---

**What.** Split from words-everyday-talk-one-engine (its first done-when clause). After a question in everyday talk ('What do you think?'), the player was offered acknowledgments ('I heard about it.', 'Huh.') because replies were picked from the subject's whole bank, not from the moves that answer the question.

**Rules.** Talk is never a list; a question gets an answer (words-everyday-talk-one-engine). Which moves answer which ask is data (conversation-rules.json answersTo), not code.

**Done when.** In a played world (buildBenchWorld) in two drawn places with seeds named, a test plays every everyday conversation the player can open over 30 days and shows that every reply offered after a question the rules name is one of the moves that answer it; the test fails without the rule.

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, src/director/everyday-answers.test.ts

**Notes.** Filed by Lane 3 (Nov 4); built on lane3/everyday-answers. The rest of words-everyday-talk-one-engine (one word maker, conversation-words.ts deleted, one move-pair grade) stays open.
