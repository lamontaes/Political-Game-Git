---
id: words-conversation-replies-read-the-one-reply-table
title: "Talks at home and in town keep a reply from a line it was judged not to follow, through the same table scene talk reads"
area: words
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: words-machine-part-3-checks-for-rules-that-judge-a-set-or-an-exchange
blocked-on: "#9067 (the conversation engine) folded into the train"
lead: words
model: sonnet
effort: medium
root: design-words-machine
source: words-machine part 3 (M5), Nov 14, 2026; Words lead's ruling in /mnt/project-files/words-lead/words-machine/part-3-pr1-ruling.md
checked: opus 2026-11-14
---

**What.** Where the player sees it: a talk at home or in town (talk:home, talk:town). A reply the reviewers judged "no" after a line (it does not follow it, or an exchange rule barred it there) can still be said right after that line in these talks, because only scene talk reads the verdicts. One way of keeping a reply from a line, not two. Seen: a talk at home where the person's answer follows the line it answers.

**Cause.** Found in code: on branch claude/words-conversation-engine-carry (#9067), `wordConversationMove` (src/english/conversation-words.ts, line 145) picks a wording by subject, part and choice and reads no reply table; scene talk's picker reads `REPLY_FOLLOWS` (src/english/reply-follows.ts) in `scoredFits` (src/english/scene-talk-words.ts). The pair builder `replyPairs` (src/english/reply-pairs.ts) lists only scene talk's pairs, so the exchange rules (`exchangeSubjects`, src/english/line-rules.ts) never see a conversation's pairs.

**Fix.** After #9067 folds: (1) `wordConversationMove` takes the piece said just before (the line answered) and drops a wording `follows(part, before)` says no to, the way `scoredFits` does, keeping all when every wording is dropped; (2) a pair builder lists the (line before, reply) pairs the conversation's subject tables can produce, and `exchangePairs` (scripts/words/run-rules.ts) adds them, so sheets and the run cover both. No new table and no new store.

**Time box.** 4 hours for one Sonnet session.

**Rules.** Replace, never layer: the conversation picker reads the same reply table scene talk reads, with no second table or store.

**Done when.** In a drawn place with its seed, a talk at home reaches a line after which a reply was judged "no"; the reply is not offered there and is offered after another line; `npm run words:rules` counts the conversation's pairs for the exchange rules. A second session, on main, plays a life, opens a talk at home, and sees no reply said right after a line the table bars it from.

**Waits on.** #9067 (the conversation engine) folded into the train.

**Files.** src/english/conversation-words.ts, src/english/reply-follows.ts, src/english/reply-pairs.ts, scripts/words/run-rules.ts
