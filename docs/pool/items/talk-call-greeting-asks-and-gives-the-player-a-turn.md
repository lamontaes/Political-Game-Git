---
id: talk-call-greeting-asks-and-gives-the-player-a-turn
title: "A person who calls or is called can ask how the player is, and the player answers before the news"
area: director
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Words builder A, Nov 14, 2026, from #9247 and the readers' notes"
model: opus
effort: medium
root: none
---

**What.** On a call the person answers and goes on with a hello that asks nothing. A real conversation has a turn: 'Is everything okay?' or 'What can I do for you?' from the person, then the player's answer, then the person's news. Three pieces that did this were taken out of the phone bank (Nov 14, #9247) because no flow gives the player the next turn after a greeting question. Seen: on a call the person asks how the player is and the player answers before the news.

**Cause.** Found in code: src/director/conversation.ts, `openConversationNow` (the comment 'a How are you? would need its own answer, so only a greeting that asks nothing opens') pushes the greeting and then opens the main topic at once (`mainTopic`, `open(main)`), so a question in the greeting is followed by the person's own line.

**Fix.** After a greeting whose last line asks (use `asksQuestion`), do not open the topic: leave the player the choices, each answered from a record (rule 108), and open the topic after the answer. The pieces to bring back are in the Nov 14 history of #9247 (data/english/parts/conversation.json, greet-core by-phone: 'Well, hello. What can I do for you?', 'Oh, hi. Is everything okay?', 'Hey. Everything okay?'). The player's answers are new lines for the Words lead's review.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: words come from the English engine's banks, and the question is answered from a record. No dice, no list picks. A question offered must be answered from a record. Builders write no lines without the Words reader's review.

**Done when.** A second session, in a drawn place with its seed named, plays the case on main through the screens a player reaches and sees the result in the player's words, by record id.

**Waits on.** nothing.

**Files.** src/director/conversation.ts, data/english/parts/conversation.json
