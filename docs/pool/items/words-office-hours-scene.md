---
id: words-office-hours-scene
title: "A resident who brings a problem to office hours is a scene for the official, about that problem"
area: words
kind: wiring
priority: 1
size: S
status: in-pr
claimed-by:
pr: #5955
blocked-on:
after: words-desk-bill-scene
source: added with npm run pool -- add
---

**What.** The constituent-cases module already has residents with a real problem (out of work with thin savings, or paid under the minimum wage) come to the official they know best at office hours, but it records the visit only in its own table and as a case made on a policy question, so the director never stages the office-hours scene; its cause waits on a producer. This item has the module record the visit (office.approached, naming the official and the resident, the problem and the office), the director size it for the official, and the office-hours scene fire from it with the resident as the one asking. The talk says the resident's own problem from the record, and the official can promise the referral the module really makes (the workforce office or the labor standards office).

**Rules.** Wire to the world: the scene fires from the case module's own visit record, read by the director, with no invented visitor. Ask why: the scene names its cause record, and the problem it speaks of comes from that record. One rule, all 56 places: the test draws places from all 56 until one has a visit.

**Done when.** src/director/office-hours-scene.test.ts in the played world (buildBenchWorld), on places drawn from all 56 with a seed nobody chose, watches the town's officials and shows each office.approached record firing the official's office-hours scene with the resident as the constituent, set in the official's office, composed with a statement about the record's own problem and citing the record id.

**Files.** src/core2/modules/constituent-cases.ts, src/director/data/director.json, src/director/data/situation-types.json, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/office-hours-scene.test.ts

**Notes.** TODO
