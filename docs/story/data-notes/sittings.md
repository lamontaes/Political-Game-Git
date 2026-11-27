# Notes that were in src/director/data/sittings.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `about`

How a sitting plays in the conversation engine (src/director/sitting.ts): a candidate answers, one question at a time, what an asker puts as a line (owner, Oct 26-29: interviews are scenes). It holds no sentence text: every line is a piece of data/english/parts/conversation.json under the subjects named in a kind's row. A kind of sitting (an interview with a reporter, a debate with its moderator) is one row under `kinds`, with its source in code (src/director/interview-sitting.ts, src/director/debate-sitting.ts) that finds the sitting's record and publishes it.

## `order.about`

The replies are shown in this order (`other` is the side of the question the record does not hold, `plain` the side it does, `brief` the way not to answer). A candidate who carries a talk on (the trait engine's conversation.reply-reach decision) sees the answers that say more first; one who keeps it short sees the brief ones first.

## `kinds.interview.about`

A reporter's interview the candidate said yes to. The press engine puts `stagedBy` on the record and the director stages the `interview-sitting` situation type from it; `published` is the record the interview's end writes.

## `kinds.debate.about`

A race's debate the candidate said yes to. The meetings engine puts `stagedBy` on the record and the director stages the `debate-sitting` situation type from it; `published` is the record the debate's holding writes. The moderator puts the questions; the player's answers are the same lines as in an interview (`answers` names the bank they come from: a stand, a vote, a rival are said the same on a stage), and the other candidates answer from their own positions when the debate is held.
