---
id: words-bank-answer-piece-keeps-each-use
title: "An answer piece used twice for one subject keeps only its first use"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by: claude/project-thread-5efbu8
pr:
after:
blocked-on:
lead: words
source: "Election results thread, Nov 15, 2026: found while staging the player-news replies (words-player-news-replies-ignore-the-race-result); split out by the Account lead"
model: sonnet
effort: low
root: none
---

**What.** A bank piece used twice for one subject's same answer, each use with its own facts (the Words lead's "I'll be okay, {first}. Thanks." to a steady housemate and, for a job lost, to a worried one), keeps only the first use, so the second never plays. Seen: each use is its own answer row.

**Cause.** Found in code: src/english/mined/conversation-bank.ts `conversationDataFromBank` skips a use when the subject's answers already hold a row of the same piece and choice, whatever that row's facts and stages. The shipped bank has no such piece yet (0 answer pieces with two uses of one choice at Train 29ef4685); the words pull request for the player's news replies adds one.

**Fix.** An answer use is skipped only when a row of the same piece and choice also has the same required facts and stages.

**Time box.** 1 hour for one Sonnet session.

**Rules.** No dice: each use is offered by the facts and stages its own row names. No new lines: the second use comes from the words pull request.

**Done when.** src/english/mined/conversation-bank-uses.test.ts (the shipped bank with a second use added to the steady reply) fails without the change and passes with it; a second session, in a drawn place with its seed named, sees the worried use said in a played talk once the words pull request is in.

**Waits on.** nothing.

**Files.** src/english/mined/conversation-bank.ts, src/english/mined/conversation-bank-uses.test.ts (new)
