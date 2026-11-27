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

## `note`

How a scene with a purpose plays (owner, Oct 15, evening: a setup, a person with a purpose, stakes, and an exchange that plays to resolved or refused). Moves only: no sentence is here; the English engine words each move from data/english/parts/scene-talk.json. A purpose names what the asker states and the player's four reply moves; `follow` is how the asker answers each reply move, chosen by the asker's traits through the shared decision table (each move's act kinds in `scene-talk.move`, data/content/trait-decisions.json, read by the trait engine's lean, the same lean every other decision reads; the highest wins, a tie by the stable hash, so no roll decides it); `again` is the player's four replies to that answer; `close` ends the exchange by its outcome. A yes or a no never ends a talk: the asker answers it, and the exchange closes only when the purpose is resolved or refused. A purpose may carry its own `follow` and `again`; the engine reads them before the shared ones, so a family talk never borrows a vote's answers.

## `purposes.talk.note`

Everyday talk (owner, Oct 29: one engine, and calibration reaches all of it): how a person takes in what the player answered in a conversation. The talk engine (src/director/conversation.ts) names the move the answer made from conversation-rules.json `replyMoves`; `follow` gives the moves that answer it, the speaker's trait lean picks one, and the scene bank words it fitted to the answer (a piece may name the move or the subject and choice it answers in `after`). After a move in `closes` the answer ends the talk and no goodbye follows it.

## `purposes.ask-vote.asks.note`

Where the player does the asking: the one asked answers yes if they already lean for it, not yet if a favor would carry them, no otherwise. Asked again: a plea carries them where the favor would at the roll; taking up their price (legislature askPrice: the player's vote on their own bill, or half a section) carries them where the price would, and is offered only where the record holds one; asking them only to stay out of the room carries them where a favor covers half their lean (absenceCarries), and they agree in a decline; pressing holds them only where they lean for it; letting it go wins nothing. On a second ask after their not yet, deferring to them ("Read it.", "Take the time you need.") keeps the ask open and wins nothing now; it is offered only on a second ask (Words lead, Nov 15).

## `purposes.desk-visit.acts.note`

The replies that say the act in their own words (Account lead, Nov 14): a reply that names the act ends the talk with one closing line from the visitor and signs or vetoes the bill through the desk (Words lead, Nov 14 20:35Z). Any other reply, a no included, leaves it on the desk and the talk goes on.

## `purposes.hearing-ask.asks.note`

Where the player is the sponsor and asks the chair of the committee that held the bill: the chair says yes only if their own stand already reaches a hearing, not yet if a favor would carry them, no otherwise, and the no gives the reason the committee record holds. Asked again: a plea carries them where the favor would, pressing holds them where they stood, and letting it go wins nothing.

## `purposes.ask-signature.asks.note`

While the player's petition circulates: the resident answers from the petition record, signed or not; asking again does not change a name already given or withheld.

## `purposes.ask-support.asks.note`

A door on the player's own canvass: the resident answers from where the knock left them; pressing wins them only where they lean for it already.

## `purposes.ask-to-serve.asks.note`

The player asks someone to serve (brief J): the one asked answers from where the serve-asks engine reads them (their ambition, the seat they would give up, how far apart the two stand on their question, what they have read about the player, whether they know the player). Yes where that read is above zero, no otherwise; pressing holds them where they stood, and letting it go wins nothing. Short of yes by less than the player's word on their own question is worth to them, they name that promise as their price (bargain): giving their word carries them and keeps a hold-question promise the player's next vote or signature on the question settles; refusing it does not carry them (gov-serve-ask-price-end).

## `purposes.cosponsor-ask.asks.note`

The player asks a colleague to sign on to their bill: the colleague answers yes if they already lean for it, not yet if a favor to the player would carry them, no otherwise, and a no says the reason the record holds (publicDeclineReason). Asked again: a plea carries them where the favor would; pressing holds them only where they lean for it; letting it go wins nothing. A yes is thanked, and the colleague closes on it. On a second ask after their not yet, deferring to them ("Read it.", "Take the time you need.") keeps the ask open and wins nothing now; it is offered only on a second ask (Words lead, Nov 15).

## `outcomes.note`

What each reply move does to the purpose: resolved closes it, refused closes it the other way, open keeps the exchange going.

## `again.note`

The player's four replies to the asker's answer, by that answer's move.

## `close.note`

How the asker ends the exchange, by outcome: never a bare goodbye after a question was answered.

## `lie.note`

A lie is caught only when the asker holds the record that contradicts it (fact knows-truth, naming its source); otherwise it is believed and stands until the record surfaces. No roll decides it.

## `home.note`

The families of a home conversation the exchange engine answers by the arcs file's own rows (talk merge plan, slice 2). Where someone says where they stand (`ownView`), the player may ask why (`why`) or agree or disagree (`takes`): the answer to why is composed under `backSubject`, the answer to a take under `takeSubject` by the reply's move, carrying the facts in `takeCarries` that the talk already holds. The replies a home talk offers (`menu`): the replies that answer a question by the move of the line that asked it (`answersTo`), the subjects a reply may go on to raise (`follows`), what the other person tells when the player asks for more (`tells`), the lines whose replies never name the same record twice on one screen (`namesOnce`), and the topics a main topic may lead on to (`related`); What a talk opens with when no recorded event leads (`topics.openingOrder`: what they share, then the player's work or home, the day's news, the address while it is recent, the quiet day last) and the subjects a person tells as news of their own life, a reaction to which is never answered with small talk (`topics.newsSubjects`). `standsTold` names the lines that tell a stand without asking, whose replies are still `answersTo`'s own. What move each answer the player gives makes (`replyMoves`, by the line's kind, then the choice) is what the `talk` purpose answers it by: a choice not listed is a plain answer, a choice that only takes their line in (`notes`) gets no answer back, and the replies a talk answers (`answerable`) are offered even when they end on a question. Where someone asks the player a small question (`giveBack`), the asker gives their own answer back after the player's: `kinds` are the questions, `answers` the player's moves a give-back answers and its stage for each, `plain` the moves that are the plain answer, and `covers` the raised kinds a give-back already told. Where someone tells news (`news`), a reply that takes a side (`sides`) is learned by everyone who heard it, and the answer is composed under `backSubject`; when the player answers a printed story the neighbor asked about with one of `tellsStand`, the neighbor says where they stand under `standSubject`. A day's own subject (their shift, news of their life) is answered back by the reply's move in composed words under `<kind>-back`; `omitsTold` names the kinds whose telling says figures the answer must not say again (W1's strict review, Nov 12: "basically saying the same thing"), and the figures: what the telling said is left out of the answer and marked `told-<fact>`, so the answer says what comes next.

## `keys.note`

The fallback for any situation with no purpose yet. One arc per situation key; pieces whose use names purpose "*" and the key serve it, and an authored purpose always wins.
