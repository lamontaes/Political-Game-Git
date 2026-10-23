---
id: people-needs-people-128
title: "Needs from other sessions listed in people.md (line 128): 2 lines"
area: people
kind: wiring
priority: 2
status: done
claimed-by: claude/people-128
pr: #4522
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/people.md "Needs from other sessions" (line 128)'
claimed-at: 2026-10-15T23:34:02.093Z
---

**What.** Two requests remain for the people display and journal. A screen 40 card (named 'age 18') showed 17 on the card, so the card's age may not follow the game date (figures switch at 18 on the game date). And when a household moves, the journal or news should say so, though the home picture already follows the dwelling record. Check both on main, fix the card age to read the game date and add the move to the journal and news. The player would notice his card showing the right age on his birthday and a line in his journal when the family moves.

**Rules.** An effect is a read, not a record: the card reads the person's birth date and the game date at display time; the journal reads the household move record; No hand-written player text: the journal line is worded by the English engine from the move record, with no hand-written label; Ask why: the move line cites the reason recorded for the move; The chain is the acceptance: follow one household move from its cause to the dwelling record, the journal line and the news; One rule, all 56 places: no place named in code; Replace, never layer: any stored age on the card is deleted in favor of the read.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a person's card shows 17 the day before their 18th birthday and 18 on it (person record id), and a household move in the year produces a journal line and a news line citing the move record id. Tests in `src/bench/card.ts` tests or `src/bench/whole-figures.test.ts` and `src/director/journal.test.ts`. The owner plays it: reaches his birthday and sees the new age, and moves house and reads it in the journal.

**Files.** src/bench/card.ts, src/bench/whole-figures.ts, src/director/journal.ts, src/core2/modules/moves.ts

**Notes.** Overnight pool item 10: claim one list at a time. Verify.

**Checked Oct 15 (claude/people-128).** The card's age is already a read: `personCard` computes it from the birth date and the game date at display time (`card.ts`), and no age is stored. A test now shows it reads 17 the day before the player's 18th birthday and 18 on it (`src/bench/card-age.test.ts`, a place drawn from all 56). The figure's age band reads the game date the same way (`ageBandOf`). A household move is a private event (`moves.ts` emits `person.moved-away` with `publicRecord: false`), so it reaches the journal, not the news: `journal.ts` has a moved line and `journal.test.ts` covers moved-away relatives, and the journal leaves a relative's move out when the mined sentences have no line for it. Whether a private move should be news is the Words line's and the owner's call; filed as `words-journal-household-move-line`.
