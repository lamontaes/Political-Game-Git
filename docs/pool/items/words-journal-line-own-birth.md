---
id: words-journal-line-own-birth
title: "The Journal's first line tells the player's own birth from the run's birth record"
area: words
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The Journal now opens on a moment for the person's own birth (src/director/journal.ts householdMoments, causeKind person.birth, place from the people engine's person.birth record of the run before the start; journal row person.birth in src/director/data/journal-rows.json). The bank words no part for that row, so the line is left out today. The bank already holds the mined, shippable part journal.look-back-line-died.i-was-born-in-place (I was born in {place}.), used only by the death look-back. Map it (and any other birth wordings) to the person.birth row's line field, or add parts, so the story starts at birth (owner, Oct 27 sitting: written like a story from birth).

**Rules.** No hand-written player text in code: the line comes from the bank (scene-standard). Words owns data/english. Every bank piece plays unless the owner's grades reject it (owner, Oct 24).

**Done when.** In buildBenchWorld in a drawn place with a 35-year-old player (place and seed in the PR body), composeJournal's first line for the player cites the record person-history:<player>:birth and names the birthplace, with the bank as shipped (no test-side mapping); src/director/journal-story.test.ts drops its test-side mapping and passes.

**Files.** data/english/parts/journal.json,src/director/journal-story.test.ts

**Notes.** lead: words. Filed by wire-opening-and-home (line 8, Oct 28). Read: OWNER-DECISIONS through Oct 28 14:50 UTC, the Oct 27 sitting log (Journal rulings); searched the pool for own birth, born in, person.birth (words-scene-cause-person-birth and words-birth-scene-lead are scenes, not the Journal).
