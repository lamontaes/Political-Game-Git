---
id: words-person-story-told-not-listed
title: "A person's story on their card is told, not listed by year"
area: words
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: fable
effort: high
root: none
source: owner, Nov 17, after playing v0.113.0 (the CTO's rows on #9750: "the People story is still a list of dated facts")
---

**What.** The story on a person's card reads as a list of dated facts: "In 2008, they started at the mill. Then in 2011, they moved here. In 2014, a child was born." Every sentence is a record with a year in front of it. The owner wants a life told, not a ledger read out.
Seen: the owner's sitting on v0.113.0, Nov 17, 2026; the person card at any officeholder.

**Cause.** Design: the owner's rulings of Nov 17, 2026 (docs/coordination/OWNER-DECISIONS.md, Nov 17: delete everything the engine has not written; the CTO's rows on #9750 name the People story as a list of dated facts). src/bench/card.ts composes the story one record at a time (`person-history.story.<kind>.<form>` wordings), opening each sentence on a time frame (`person-history.when.*`) when the one before did not, and never joins two records into one sentence or says what one meant for the next. The bank has no pieces that carry a cause across records ("the mill closed, so they moved here"), and the composer has no read of which records explain which (the moves engine's reason, the job's end reason, the birth after the partnering).

**Fix.** Read the records' own reasons (a move's reason, a job's end, a partnering before a birth) and compose a paragraph by life group: one opening sentence per group that names the span, then the records as clauses joined by their reasons, the year said once per paragraph. New pieces in data/english/parts/person-history.json for the joins (Story writes them); the composer in card.ts reads the reasons through the engines that keep them, never a second store. Rule 101 holds: no figures beyond the year.

**Time box.** 6 hours, the Story lead at high, one Sonnet helper for the composer's test.

**Rules.** The simulation is the one layer that knows anything (the card is a view); no hand-written player text in code; an effect is a read (the reasons already on record).

**Done when.** A second session opens three people's cards in a drawn place on main (an officeholder, a coworker, a relative) and each story reads as paragraphs with at most one year named per paragraph and at least one sentence that joins two records by a reason; `tests/english-parts-banks.test.ts` and the card's test pass.

**Waits on.** The cut of Nov 17 landing (#9999, #10011).

**Files.** src/bench/card.ts, data/english/parts/person-history.json

**Notes.**
