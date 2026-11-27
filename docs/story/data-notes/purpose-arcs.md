# Notes that were in src/director/data/purpose-arcs.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `home.menu.answersTo.about`

The reply choices that answer a question, by the move of the bank piece that asked it (owner, Nov 1: questions get answers; Oct 29: a question is answered before anything else). A choice not listed is not offered after that question. Moves and choices only; no sentence.

## `home.menu.tells.about`

Owner, Oct 14, 2026, night (Q10: one 'listen' and one 'ask more'): when the player answers the other person's line with a choice that asks for more, the other person tells this subject of their own, from their records, as a side remark on the same topic. By the line's kind, then the choice.

## `home.menu.namesOnce.about`

Lead, Nov 11, 2026, from the reviews of PR 8736 and PR 8750: one screen names a thing once. For these kinds of line, no two of the player's replies say the same record's words (the employer, the job, a name); the reply ranked first keeps it. Kinds only; no sentence.

## `home.menu.related.about`

Owner, Oct 14, 2026, night: a talk has one main topic with side remarks, and one topic may lead to a related one. For each main topic, the topics it may lead on to, in order; after one of them the other person closes the talk.

## `home.replyMoves.about`

What move each answer the player gives makes, by the line's kind, then the choice: the scene engine's `talk` purpose (purpose-arcs.json) answers it by that move (owner, Oct 29: one engine for every line). A choice not listed is a plain answer. A choice that only takes their line in (`notes`: "Oh, okay.") gets no answer back; the talk carries on. A choice that asks a question is offered only where the other person can answer it: it raises a subject they have, asks them to tell more (`tells`), or makes a move the talk answers (a request, a plea to be left alone, a reaction).

## `home.giveBack.about`

Lead, Nov 13, 2026 (conversation.test, Jackson Center: every talk away from home ended on the player's answer): a person who asks the player a small question gives their own answer back after the player's, from their own record, and that closes the talk with something said; a question with nothing to give back is not asked. The asked kinds; their give-back lines are composed under `<kind>-give`.

## `home.giveBack.covers.about`

Lead, Nov 14, rule 53 (one fact, once): a give-back already said where the asker lives, so the player's own question about it (a raised `home`) is not answered a second time. The asked kind, then the raised kinds its give-back covers.

## `home.giveBack.answers.about`

Coordinator for the account lead, Nov 15 (owner, Nov 14: replies must look like choices): asked about someone both know, the player may answer, or answer and ask back how the asker is or why they ask, never a no against the record; the asker's give-back answers each in its own stage. The asked kind, then each player's move its give-back answers and the give-back's stage for it. Asked whether they remember a school both went to, the asker says how long it has been, or agrees where the player's answer already said it (Cumming, Iowa, seed 7952d3f3e3253ee4, Nov 15).

## `home.giveBack.plain.about`

Coordinator for the account lead, Nov 15: the moves that are the plain answer a turned-back question ("Have you?", "Why do you ask?") follows, for an asked kind with no move named plain. The asked kind, then its plain moves in order.
