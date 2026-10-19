---
id: words-housing-moved-lines
title: "A household's move into a new home has journal and scene words from the English engine"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When a household moves into a new home the journal and the scene have no words for it. Have the English engine word the move from the housing records: where from, where to, the rent or price and who moved. Add the parts to the data banks and wire the journal and the director to read the move record.

**Rules.** No hand-written player text: the words come from the English engine and its data banks. An effect is a read, not a record: the journal and director read the move record at the moment it is written.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and seed the builder did not choose, a household that moves has a journal line and a scene wording that cite the move record id, the batch page grades them, and a test in src/director states it.

**Files.** src/director/journal.ts, src/core2/modules/housing.ts, data/english/parts/journal.json

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
