---
id: words-journal-household-move-line
title: "A household move gets a journal line even for a relative who moves away"
area: words
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found by people-needs-people-128 (Oct 15, 2026)"
---

**What.** When a household moves, the journal leaves a relative's move out because no mined sentence says that a relative moved away (`src/director/journal.test.ts`, "No mined sentence says a relative moved away"). The move itself is recorded (`person.moved-away`, private). Author or mine the pieces so the journal can say who moved and where, from the move record, for a relative and for the player's own household. Pieces come from the banks in `data/english/parts/`; nothing is typed into code.

**Rules.** No hand-written player text: the English engine words it from the record. Ask why: the line cites the recorded reason for the move. One rule, all 56 places.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named) a move of a relative or of the player's household produces a journal line citing the move record id, composed by the engine, and a test in src/director/journal.test.ts covers it. The owner plays it: a cousin moves away and the journal says so.

**Files.** src/director/journal.ts, data/english/parts/

**Notes.** The owner's later rulings on journal lines carrying their subject are in OWNER-DECISIONS.md, "Journal lines carry their subject".
