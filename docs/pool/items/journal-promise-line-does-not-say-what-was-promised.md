---
id: journal-promise-line-does-not-say-what-was-promised
title: 'The journal says "I made my son Nicholas a promise" and never what was promised'
area: words
kind: bug
priority: 3
size: S
status: open
lead: words
standard: 2
model: sonnet
effort: medium
root: none
after:
claimed-by:
pr:
blocked-on:
source: second reader, Nov 15, Sherrodsville OH petition-short run
claimed-at:
---

**What.** In `/mnt/project-files/words-lead/petition-short/played-3369a8c1.md` (head 3369a8c1, place 3972242, seed `scan-7`, entry dated 2025-06-08, after the player says yes to their son running the campaign) the Journal reads "I made my son Nicholas a promise." It does not say what was promised (he became the campaign's manager). Seen: in the player's Journal screen, My life.

**Cause.** Found in code: src/director/promises.ts holds the record, and `journal.scene-line-promise.i-made-other-a-promise` ("I made {other} a promise."), used for the scene-ending `scene-ending:promise` moment; the moment carries the other person but the line has no slot for the kind of promise, though the promise record has one (`src/director/data/promise-kinds.json` rows, `promises.ts`). The line reads only the person.

**Fix.** Read the promise record's kind from the moment's cause and say it ("I made my son Nicholas a promise to run my campaign."): one wording per promise kind in the bank, each with the slot filled from the record; the bare wording stays only for a promise whose kind the record does not name. Which record the Journal reads: the promise record named by the moment's cause id (today `promises.ts`); the promise record is moving into the engine (thread "Build saves and move promises into the engine"), so the read goes through whatever that thread leaves as the one promise reader, not a copy.

**Time box.** 4 hours, after the promises move lands.

**Model and effort.** Sonnet, medium.

**Rules.** No hand-written text in code; the kind comes from the record, the words from the bank. A view that stores its own copy of the fact is a duplicate.

**Done when.** In a played world at a named place and seed, each kind of promise a scene can end on is told with what was promised, by record id, and a second session sees it in the running game through the screens a player reaches; the bare "a promise" remains only where the record has no kind.

**Waits on.** the promise move into the engine (thread "Build saves and move promises into the engine").

**Files.** data/english/parts/journal.json, src/director/journal.ts, src/director/promises.ts

**Notes.** Filed by the Journal builder (#9119 thread) at the Account lead's request, Nov 15; not part of #9119. Checked the pool first: no item names either.
