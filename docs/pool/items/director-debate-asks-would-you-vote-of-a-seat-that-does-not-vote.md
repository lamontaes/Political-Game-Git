---
id: director-debate-asks-would-you-vote-of-a-seat-that-does-not-vote
title: "A debate asks a mayor or county executive 'would you vote to' when the seat does not vote"
area: director
kind: bug
priority: 2
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
root: none
source: campaign events debate replay, Nov 14 2026
checked:
---

**What.** The moderator's question line in a debate is "Tell us: would you vote to {to}?" for every seat. In a race for a seat that does not vote on bills (a mayor, a county executive, a governor) the line asks the candidate to say how they would vote, which the office never does. Seen: replayed county commissioner debates say it correctly, and an executive's debate would say the same line to a person who signs or vetoes.

**Cause.** Found in code: the piece `conversation.debate-question-ask.tell-us-would-you-vote-to-to` carries no fitting fact, and the debate's ties (`tieFacts` in src/director/debate-sitting.ts, `seatFact` in src/director/sitting-ties.ts) name the seat but never whether it votes, so the bank cannot pick a different wording for an executive seat.

**Fix.** Add one fact to the sitting's ties from the office record, `seat-votes` where the office is a member of a body and `seat-executes` where it is an executive (the field the offices module already keeps to tell the two apart; confirm it in the first hour), and fit the ask by it: the existing line for `seat-votes`, and at least two new wordings for `seat-executes` that ask what the candidate would do about the same {to} ("Tell us: what would you do about {to}?"). The interview sitting reads the same fact. No new store.

**Time box.** 3 hours for one Sonnet session.

**Rules.** An effect is a read, not a record: the wording reads the office record's own kind when the line is picked. Plain American English: no office jargon in the new lines. Review: words.

**Done when.** A second session plays a debate for a mayor or county executive race in a drawn place with the seed named, and sees that no question line in it says "would you vote", and also plays a council or commissioner race and sees the vote wording kept, with the office record id named for each.

**Waits on.** Nothing.

**Files.** src/director/sitting-ties.ts, src/director/debate-sitting.ts, src/director/interview-sitting.ts, data/english/parts/conversation.json

**Notes.** Raised by the coordinator Nov 14 13:24Z; #9152 reworks the answer menus (its "I'd vote" forms for seats that vote) and does not touch this ask line. Evidence: /mnt/project-files/words-lead/campaign-events/runs/county-debate8.md.
