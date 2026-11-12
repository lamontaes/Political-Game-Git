---
id: words-grade-round-2-nov10
title: "Rewrite what the grading pulls after the eight rule tests of #8204"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr: "#8252"
blocked-on:
lead: words
source: CTO, Nov 10 5:48 p.m. (step 1), after #8204 merged eight more of the owner's rules with tests
---

**What.** `npm run words:grade` on main after #8204 pulls one line: the news-ask question "What do you think?", under the rule question-names-its-subject (owner, Oct 15: "What does that mean?"). It is rewritten in place as "What do you make of the news?", which names the news it asks about. The spot keeps its five other lines.

**Rules.** The rewrite cites the rule it answers; no line the owner graded good is removed; American English.

**Done when.** `npm run words:grade` on the branch shows 0 pulled, 0 waiting and 0 spots made silent; english-parts-banks, the English guards, the conversation bank test and liked-lines-kept pass.

**Time box.** 1 hour for one session.

**Files.** data/english/parts/conversation.json, data/english/pulled.json
