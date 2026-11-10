---
id: words-scene-ending-writes-its-record-part-3-keep-nothing-kinds
title: "The nine keep-nothing scene kinds keep a record or are listed with the reason"
area: words
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: medium
root: design-story-director
source: split from words-scene-ending-writes-its-record in the pool redo, Nov 10, 2026
standard: 2
---

**What.** Nine scene kinds have endings that all keep nothing: race-told, diploma-home, no-diploma-home, filing, door-signature, family-win, family-loss, desk-bill and new-baby. Each either keeps a record an engine reads or is listed with the reason it keeps none.

**Cause.** Found in code: src/director/data/purpose-arcs.json (the `keeps` field), where every ending of these nine kinds has keeps "none" (read Nov 10).

**Fix.** For each kind, decide with the engine that owns the record: write one (name the writer) or list the kind in a file the guard of part 4 reads, with the reason it keeps nothing.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No consequence, no scene (scene-standard rule 1). An effect is a read, not a record: the ending calls an existing engine writer and never invents a parallel table. No dice: the record follows the ending the player chose, never a roll. One rule, all 56 places: no place is named in logic.

**Done when.** A second session, not the builder, reads the nine kinds in a drawn place's played year (buildBenchWorld, place and seed named): each one either wrote a record by id that another engine read, or is listed with its reason in the file the guard reads.

**Waits on.** Nothing.

**Files.** src/director/data/purpose-arcs.json, src/director/purpose-scene.ts, src/director/scene-talk.ts
