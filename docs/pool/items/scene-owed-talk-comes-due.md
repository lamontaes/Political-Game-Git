---
id: scene-owed-talk-comes-due
title: "A promised talk at home that has not happened by its day becomes a scene from the person it was promised to"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: director
after:
model: sonnet
effort: medium
root: design-story-director
checked: fable 2026-11-10
---

**What.** Scenes at home end on lines such as "We'll talk more later." that nothing records, so the later never comes. When a reply defers a talk to a day (record people-owed-talk-record) and that day arrives with no time together since, the person owed should speak, naming what was promised and what is still open. The player answers in four stances: sit down now, give a new day, say it cannot be done, or turn it on them, and each closes or moves the owed record. No owed-talk situation type exists, and the packet with drafted lines is on main. Seen: a person you promised "we'll talk later" brings it up on the day, and you answer in four ways.

**Cause.** Design: docs/design/scenes/from-life/owed-talk-comes-due.md under docs/design/story-director.md. src/director/data/situation-types.json holds no owed-talk type, and the owed-talk record the type reads is the open item people-owed-talk-record.

**Fix.** Add a situation type to src/director/data/situation-types.json (arc in src/director/data/purpose-arcs.json) fired from an unkept owed-talk record on its due day with no time together since, cast as the person owed, with four stances that write the owed record closed or moved, and delete the generic "We'll talk more later." where the talk has a stake. The lines are Story's under the Nov 10 split of words work.

**Time box.** 4 hours.

**Rules.** Scene standard rule 1 (no consequence, no scene) and rule 4 (their own words): the scene fires only from the unkept record and writes the closed or moved record back. No dice: the relative's answer follows their traits and the tie, never a chance. No hand-written player text in code.

**Done when.** A second session, in a drawn place in buildBenchWorld, sees that after the put-off reply and a due day with no time together a situation type fires for the person owed, cast from the owed-talk record, opening with the topic and the day in their own words, with four replies that are four stances and the owed record closed or moved. A director test names the place, the seed and the record ids and fails when the owed record is absent.

**Waits on.** people-owed-talk-record (open).

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, docs/design/scenes/from-life/owed-talk-comes-due.md

**Notes.** Packet with drafted lines: docs/design/scenes/from-life/owed-talk-comes-due.md. Waits on people-owed-talk-record (lead effects). Reference code for the stake that precedes it: PR 6237. Filed by Scene researcher A, Oct 27; lead director builds, words lead owns the final lines.
