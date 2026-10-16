---
id: words-family-reply-turn
title: "A reply about a relative asks about theirs"
area: words
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/words-family-reply-turn
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T02:48:57.615Z
---

**What.** When a speaker answers a question about their own relative ('How is your mother?' 'She's doing well.'), the reply stops there or moves to an unrelated topic. Real talk returns the question: 'And yours?' Add a reply turn in the conversation director so that after the listener asks after the speaker's relative, the speaker may ask about the listener's relative when the records say the listener has one, with a move that follows from the first. The player would notice conversations that go both ways, as people talk.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/american-english-sweep.test.ts` (run `npm run spelling`); No dice: whether the speaker turns the question follows their traits, closeness and what is recorded about the listener's relative, never a percentage; An effect is a read, not a record: the director reads the listener's relative records and the conversation's last line when it offers the turn; Ask why: the turn cites the relative record that made it askable; Look before you ask: owner batch rulings in OWNER-DECISIONS.md: a reply's second move must follow from its first, nobody asks after someone not recorded; One rule, all 56 places: no person or place named in parts; Replace, never layer: no parallel reply path is left beside the new turn.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a conversation in the year in which the player is asked after his mother and then asked back about the listener's sister shows the turn with both relative record ids, and `src/director/conversation.test.ts` asserts it is offered only when the listener has that relative. The lines are composed through the real engine in a drawn place (named, with seed) and graded by the owner in the next words batch page under `docs/grading/`. The owner plays it: answers a neighbor about his father and is asked about his own.

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, data/english/parts/conversation.json, src/director/conversation.test.ts

**Notes.** Rewritten to the quality gate 2026-10-15 (the item was a stub when added with `npm run pool -- add`).
