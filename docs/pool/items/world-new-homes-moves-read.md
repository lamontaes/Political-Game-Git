---
id: world-new-homes-moves-read
title: "A move into a new rental is read by the director or the news, and a stabilized renewal carries its cap"
area: world
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/housing-moved-read-s6
pr: #5098
blocked-on:
source: "split from world-new-homes-moves-not-reached"
claimed-at: 2026-10-19T18:39:32.706Z
---

**What.** Households now move into new rentals in a played year (the housing module's `moves` table fills and a `housing.moved` event is emitted for each full person), but nothing reads that event: the director has rules for evictions, status changes and purchases but none for a move, and the journal has no row for it. Add the director rule and the journal row for `housing.moved`, with the words from the English engine's banks, so a watched person's move into a new home becomes a scene and a journal line. In a place with rent stabilization, a lease renewal in a new building carries the capped rent and its law id.

**Rules.** An effect is a read: the director or the news reads the move record by id. No hand-written player text: the lines come from the English engine. One rule, all 56 places. The chain is the acceptance: follow one move to the rent change, the person and the journal line.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a move record id appears in the director's ledger or the journal for a named person, and in a place with rent stabilization a lease renewal record carries the capped rent and the law id. A test beside src/core2/housing-pipeline.test.ts covers the read. The owner plays it: reads a journal line about a neighbor moving into the new building.

**Files.** src/director/data/director.json, src/director/data/journal-rows.json, src/core2/housing-occupancy.ts, src/core2/housing-pipeline.test.ts

**Notes.** The director and journal data and the words belong to the Words and director line; take the producer from there. Split from world-new-homes-moves-not-reached.
