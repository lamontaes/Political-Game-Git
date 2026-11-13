---
id: words-filing-petition-lines-carry-the-record
title: "The clerk's petition talk after filing says stock lines that name nothing on record (40 counted filing-petition lines)"
area: words
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: Words builder W3
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Fable A, Nov 13 04:04Z and 04:19Z on #8928 (the golden-path scenes, the filing scene first)
---

**What.** After the player files, the clerk's scene (the director's `filing` type, purpose filing-petition) answers with lines that carry no fact: "The counter closes at five sharp.", "That's the law's number, not mine.", "Good luck out there.", "When will I know I'm on?". Forty of its 57 lines name nothing on record, so the clerk sounds the same in every town and race. Seen: the talk box the day after filing, in any drawn place.

**Cause.** Found in code: the filing-petition parts in data/english/parts/scene-talk.json were written as whole lines with no insert, and the scene's facts (purpose-scene.ts `petitionFacts`) carried the signatures, the due date and the walk-through, but not the race's next vote, so a line about when the candidate will know had nothing to say it with. The list of who filed before said a party before every name and every name however many (Fable A, Nov 13 04:49Z, rule 2).

**Fix.** Each line says the record it is about: the signatures, the day they are due, the office, the town, and the race's next vote (`vote-day`, from the contest, added to `petitionFacts`); a line with no record behind it is deleted. The list of filers names three, then counts, with no party before each name. Keys are kept, so the replies and answers stay linked.

**Time box.** 2 hours

**Rules.** No hand-written player text: every line is a bank part filled from the filing's records. Replace, never layer: the 40 counted lines are rewritten or deleted, not kept beside new ones.

**Done when.** A second session, in a drawn place on main, files at the counter, turns the day and opens the clerk's scene: every line the clerk and the player say names the signatures, the due day, the office, the town or the next vote from the filing's records, and the scene-talk count in tests/guards/english/line-inserts-baseline.json is 40 lower than before.

**Waits on.** #8910 (the move sets this branch is stacked on) and #8922.

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts, src/director/words.ts, src/director/speech-builder.ts, src/director/rival-filed-late.test.ts
