---
id: words-card-lost-race-says-its-year
title: "A card's lost-race line says the year the race was held"
area: words
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
root: none
model: sonnet
effort: medium
source: "Account lead, Nov 14: carry of #8616 (engine only; its three line changes were left for the Words lead)"
---

**What.** A person who lost a race before the game began now has it on their card ("She lost the race for assessor."), but the sentence does not say when. Several lost races on one card read alike. #8616 had the three lines say the year; the train holds the shorter forms. Seen: on the card of a townsperson who lost a race before the game began, in the life story.

**Cause.** Found in code: `person-history.story.office.lost.third`, `.they` and `.i` in `data/english/parts/person-history.json` read "{who} lost the race for {office}." with no `{year}`, and the `politics/lost` case of `lineOf` in `src/bench/card.ts` passes only `office`. The card line already carries the race's year as its date (`event.date.slice(0, 4)`).

**Fix.** The Story session writes the three lines with "in {year}" ("{who} lost the race for {office} in {year}.", "They lost the race for {office} in {year}.", "I lost the race for {office} in {year}."), and `card.ts` passes `year: event.date.slice(0, 4)` to `office.lost`. Words lead line first: the lines under `data/english/parts/` are the Story session's alone to write.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** No hand-written player text in code: the year is a slot in the bank piece. One rule, all 56 places: nothing names a place.

**Done when.** A second session, in a drawn place it names with its seed, opens the card of a townsperson who lost a race before the start (dev mode's Trace on a past race from before the start finds the named loser) and reads the lost race with its year in the sentence.

**Waits on.** #9172 (the engine that puts a lost past race on the loser's record).

**Files.** data/english/parts/person-history.json, src/bench/card.ts

**Notes.** Waits on #9172 (the engine that puts a lost past race on the loser's record). Source: #8616.
