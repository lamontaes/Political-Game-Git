---
id: words-scene-ending-writes-its-record-part-4-guard
title: "A test fails when a scene ending writes nothing and is not listed"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
after: words-scene-ending-writes-its-record-part-1-favor-and-promise, words-scene-ending-writes-its-record-part-2-trust-and-crime, words-scene-ending-writes-its-record-part-3-keep-nothing-kinds
blocked-on:
lead: director
model: sonnet
effort: medium
root: design-story-director
source: split from words-scene-ending-writes-its-record in the pool redo, Nov 10, 2026
standard: 2
checked: fable 2026-11-10
---

**What.** Once the endings write their records, a guard keeps it so. A test walks every ending of every scene kind. It fails when an ending keeps nothing and its kind is not on the list of kinds that keep nothing for a stated reason.

**Cause.** Found in code: nothing tests it; src/director/data/purpose-arcs.json endings are read only into labels (src/director/scene-talk.ts line 56).

**Fix.** Add the test beside src/director/scene-talk.test.ts reading purpose-arcs.json and the list of part 3.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No consequence, no scene (scene-standard rule 1). An effect is a read, not a record: the ending calls an existing engine writer and never invents a parallel table. No dice: the record follows the ending the player chose, never a roll. One rule, all 56 places: no place is named in logic.

**Done when.** A second session, not the builder, in a drawn place changes one ending to keep nothing without listing it and sees the test fail by naming the kind and ending, then restores it and sees the test pass.

**Waits on.** Parts 1 to 3 (words-scene-ending-writes-its-record-part-1-favor-and-promise, words-scene-ending-writes-its-record-part-2-trust-and-crime, words-scene-ending-writes-its-record-part-3-keep-nothing-kinds).

**Files.** src/director/scene-talk.test.ts, src/director/data/purpose-arcs.json
