---
id: words-person-history-told-in-stretches
title: "A person's story groups the records of one stretch of life into one telling, not one sentence each"
area: words
kind: wiring
priority: 2
size: M
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
source: "The CTO's 20:43Z review (7143979192 on #10377): the story column is still one fact per line ('Later on, in 1982, he entered high school… He was laid up in the hospital in 2007'); W7 for the Story lead, Nov 24 21:03Z"
checked:
---

**What.** A person's story on their card, and the player's own on the You screen, still reads one fact per line: "Later on, in 1982, he entered high school… He was laid up in the hospital in 2007." The owner graded this kind down again today. A stretch of life (two moves and a layoff in a few years, or school, a first job and a marriage) should be told together, the way a person tells their life, not as a log of records. Seen: the story column of any person's card and "My life" on the You screen.

**Cause.** Found in code: `tellHistory` (src/bench/card.ts:974) folds only runs of the same kind: terms in one office, spells at one employer, and work elsewhere in one place, plus more than two jobs into one list. Every other record stays its own sentence, so records of different kinds in the same years are never joined. A bank can't fix this, because each piece words one record. W7 has already landed stretch openers and a `{then}` slot in person-history.json (story/w-loading, dead63a8), with nothing yet to fill them.

**Fix.** After the same-kind folds in `tellHistory`, group the folded lines into stretches of life by date: a gap between records, or a change of place or stage, closes a stretch. Compose each stretch as one telling through the English engine's one joiner, opening it with a stretch opener and joining its records with `{then}`. Keep every record's id on the stretch. Write no new bank pieces in code; W7 writes the lines.

**Time box.** 3 hours.

**Rules.** No hand-written player text: the openers and joins come from person-history.json, never from code. Ask why: every telling keeps the record ids of everything it joins, so a stretch can still be traced line by line. One model, two tiers: an official, a resident and the player are told by the same rule.

**Done when.** In three drawn places (named with seeds), the cards of an official, a resident and the player each tell at least one stretch that joins records of different kinds into one telling, quoted before and after in the PR, with every joined record id listed. A second session sees a card's story read in stretches.

**Waits on.** Nothing. The openers and `{then}` are on story/w-loading until it merges.

**Files.** src/bench/card.ts, data/english/parts/person-history.json
