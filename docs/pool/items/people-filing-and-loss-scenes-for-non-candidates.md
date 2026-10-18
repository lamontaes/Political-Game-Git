---
id: people-filing-and-loss-scenes-for-non-candidates
title: "Listeners tied to a candidate get a filing scene as the candidate, and a race-lost scene as the loser, for races they never entered"
area: people
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/scene-subject-named
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T17:33:44.996Z
---

**What.** A watched person tied to a candidate got a filing scene casting them as the candidate, and a person tied to a race got a race-lost scene casting them as the loser, though the filing and result records name only the people who ran. A probe of three generated towns over a year found 62 of 84 filing scenes and all 153 race-lost scenes staged for people the record does not name. The director gives an event's moment to anyone tied to a person it names, and these scene kinds bind the moment's person as the candidate. The same fault as the hearing scene for a listener.

**Rules.** No hand-written player text; ask why: the scene must cite a record that names the person it is about. An effect is a read: the director reads the cause record's people at the moment it stages the scene.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, every filing, race-lost and hearing scene is for a person the cause record names, shown by scene and record ids; a test in src/director proves it and fails on main.

**Files.** src/director/data/situation-types.json, src/director/scene-subject-named.test.ts.

**Notes.** Uses the `causeNames` match condition added with the hearing fix. Other kinds that bind the person as a participant (recall, appointment, scandal, floor vote) were not seen unnamed in the three towns probed; the test covers the three seen.
