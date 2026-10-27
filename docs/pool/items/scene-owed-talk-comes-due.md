---
id: scene-owed-talk-comes-due
title: "A promised talk at home that has not happened by its day becomes a scene from the person it was promised to"
area: director
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: director
---

**What.** Scenes at home end on lines such as 'We'll talk more later.' that nothing records, so the later never comes. When a reply defers a talk to a day (record people-owed-talk-record) and that day arrives with no time together since, the person owed should speak, naming what was promised and what is still open. The player answers in four stances: sit down now, give a new day, say it cannot be done, or turn it on them, and each closes or moves the owed record.

**Rules.** Serves scene-standard rule 1 (no consequence, no scene) and rule 4 (their own words): the scene fires only from the unkept record and writes the closed or moved record back. No dice: the relative's answer follows their traits and the tie, never a chance.

**Done when.** In a drawn place in buildBenchWorld, after the put-off reply and a due day with no time together, a situation type fires for the person owed, cast from the owed-talk record, opens with the topic and the day in their own words, has four replies that are four stances and writes the owed record closed or moved, shown by a director test that names the place, the seed and the record ids and fails when the owed record is absent; the generic 'We'll talk more later.' is deleted where the talk has a stake.

**Files.** src/director/data/situation-types.json, src/director/purpose-scene.ts, data/english/parts/scene-talk.json

**Notes.** Packet with drafted lines: docs/design/scenes/from-life/owed-talk-comes-due.md. Waits on people-owed-talk-record (lead effects). Reference code for the stake that precedes it: PR 6237. Filed by Scene researcher A, Oct 27; lead director builds, words lead owns the final lines.
