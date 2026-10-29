---
id: words-scene-bill-held-in-committee
title: "A bill held in committee is a scene: the sponsor asks the chair or a committee member for a hearing"
area: words
kind: wiring
priority: 2
size: M
status: done
claimed-by: scenes-c/bill-held
pr: #6298
blocked-on:
lead: words
source: added with npm run pool -- add
claimed-at: 2026-10-27T05:20:32.234Z
---

**What.** The legislature records bill-held-in-committee (11 to 32 a year in drawn places) and nothing in the director reads it, so a chair burying a bill is never a scene. Add situation type bill-held: the sponsor pleads for a hearing with the committee's chair, or with a committee member who could press the chair; four replies are four stances (set it, keep it held, send it to study, trade for something).

**Rules.** Wire to the world: the scene fires from the legislature's committee record; the bill, sponsor and chair come from it. No dice: no roll picks the reply. One rule, all 56 places: the test draws places from all 56. No real name or quoted line ships.

**Done when.** src/director/hold-scenes.test.ts in the played world (buildBenchWorld), places drawn from all 56 with a seed nobody chose, shows a bill-held-in-committee record firing bill-held for the chair and for a committee member, cast with the sponsor, naming the bill, citing the record id; the test fails when the record is absent; lines pass player-screen-text.

**Files.** src/director/data/situation-types.json,src/director/data/purpose-arcs.json,src/director/civic-roles.ts,src/director/purpose-scene.ts,data/english/parts/scene-talk.json,src/director/hold-scenes.test.ts,docs/design/scenes/from-life/bill-held-in-committee.md

**Notes.** lead: words. Time box 4 h. Episode packet: docs/design/scenes/from-life/bill-held-in-committee.md. Scene builder C.
