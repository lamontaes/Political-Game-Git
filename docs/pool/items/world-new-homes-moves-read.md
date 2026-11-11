---
id: world-new-homes-moves-read
title: "A move into a new rental is read by the director or the news, and a stabilized renewal carries its cap"
area: world
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
root: design-life-record
source: "split from world-new-homes-moves-not-reached"
claimed-at:
checked: fable 2026-11-10
---

**What.** Households now move into new rentals in a played year (the housing module's `moves` table fills and a `housing.moved` event is emitted for each full person), but nothing reads that event: the director has rules for evictions, status changes and purchases but none for a move, and the journal has no row for it. A move is a "home" entry in the life record, which the journal and director read. Have the housing move write that entry, and add the director rule and journal row so a watched person's move into a new home becomes a scene and a journal line, with words from the English engine's banks. In a place with rent stabilization, a lease renewal in a new building carries the capped rent and its law id.

**Cause.** Design: docs/design/life-record.md (a life entry of kind "home": a move, a home bought, an eviction, a home damaged by a disaster; the engines write it and the journal reads it). `housing.moved` is emitted in src/core2/housing-occupancy.ts (line 383) and nothing reads it.

**Fix.** Have the housing move write a life-record home entry (with the stabilized capped rent and law id on a renewal), and let the journal and director read it; the Words line writes any new lines through the English engine.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: a scene and a Journal line when a person the player watches moves into a new home.

**Rules.** An effect is a read, not a record: the director or the news reads the move record by id. No hand-written player text: the lines come from the English engine. One rule, all 56 places. The chain is the acceptance: follow one move to the rent change, the person and the journal line.

**Done when.** A second session, on main in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), plays a year in dev mode and finds a move record id in the director's ledger or the journal for a named person, reads the journal line about a neighbor moving into the new building, and, in a place with rent stabilization, finds a lease renewal record carrying the capped rent and the law id. A test beside src/core2/housing-pipeline.test.ts covers the read.

**Waits on.** core-life-record.

**Files.** src/director/data/director.json, src/director/data/journal-rows.json, src/core2/housing-occupancy.ts, src/core2/housing-pipeline.test.ts

**Notes.** The director and journal data and the words belong to the Words and director line; take the producer from there. Split from world-new-homes-moves-not-reached.

Oct 29 (CTO, second account): PR #5098 closed as stale under the owner's standing approval; back to open. Branch `claude/housing-moved-read-s6` is kept; claiming this item takes it over.

**Notes (Fable's check, Nov 10).** This item also covers words-housing-moved-lines (proposed drop): the lines for a household's move within town are worded from this same `housing.moved` record.
