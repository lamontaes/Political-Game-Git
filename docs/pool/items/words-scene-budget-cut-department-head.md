---
id: words-scene-budget-cut-department-head
title: "A cut to a budget line the council adopts brings the head of that department to the executive, as a scene"
area: words
kind: feature
priority: 2
size: S
status: done
claimed-by: words/helper-d-budget-cut
pr: #6296
blocked-on:
source: owner, Oct 27 (executive scenes, every level); scenes-from-life episode budget-cut-department-head
lead: words
claimed-at: 2026-10-27T05:45:33.000Z
---

**What.** Scene builder D's first episode, from a real city budget fight in which the council cut about seven percent from most departments and the police, fire, public works and code enforcement heads each said what their cut would stop. In play, when a budget record lowers a spending line and names the executive, the person seated in the post that line pays for comes to the executive: they say how much was cut, how much of the line that was and how long they have held the post. The executive answers with one of four stances: carry it back to the council, let it stand, give half back, or ask what it stops. The ending that carries it back or gives half back opens the executive's office screen, and every reply is recorded as a scene reply.

**Rules.** No dice: which head comes is the person the appointment record seats in a post on that line, and what they say follows their traits and the facts of the record. Wire to the world: the cause record, the appointment and the adopted budget are read by the director, and the scene cites each by record id. No hand-written player text in code: every word is a bank piece in data/english/parts/scene-talk.json worded by the English engine, with versions by speaker bearing and by what the record holds.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a budget-line-changed cut record that names the mayor casts the post-holder of that line as the head and composes the budget-cut scene citing the record and the appointment by id; a raise or a line no post draws on casts no head; two trait profiles of the head say it differently; the four root replies are four different moves; src/director/budget-cut-scene.test.ts checks each and fails when the trigger record is absent. The engine record that names the executive is world-budget-cut-names-the-executive.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/director.json, src/director/civic-roles.ts, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/budget-cut-scene.test.ts, docs/design/scenes/from-life/budget-cut-department-head.md

**Notes.** Branch words/helper-d-budget-cut. The scene is built and tested against the record shape the engine item will write; until that item lands the budgets engine names no one on a cut, so the scene does not fire in play (shown in a drawn mayor's year by the test). Lead: words.
