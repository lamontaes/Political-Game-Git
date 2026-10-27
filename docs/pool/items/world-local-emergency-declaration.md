---
id: world-local-emergency-declaration
title: "A mayor or county executive's emergency order is recorded naming them, and gives the departments spending authority against the disaster"
area: world
kind: feature
priority: 3
size: M
status: open
claimed-by: 
pr:
blocked-on:
source: scene researcher Helper D, Oct 27; scenes-from-life episode disaster-first-hours (a city's mayor signed an emergency executive order within hours of a tornado)
lead: laws-effects
claimed-at: 
---

**What.** The executive-powers table and the executive engine give only a governor the power to declare an emergency; a mayor or county executive has none, though a real mayor's first act after a tornado is an order that gives the departments emergency powers. Add a recorded local emergency order, naming the executive and the disaster record that caused it, available where the state's law gives local executives the power and decided by the executive's traits when they are not the player. The order moves a named budget line toward the response, as the governor's declaration does, so the budgets engine and the departments read it.

**Rules.** No dice: whether and when an executive signs follows the power the state gives them, their recorded traits and the disaster on record, never a percentage. Wire to the world: the order is read by the budgets engine, which moves a line, and by the director. One rule, all 56 places: the power comes from the state's own law in the table and no place is named.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a year with a recorded disaster in a place whose law gives local executives the power shows a local emergency record naming the executive and the disaster, a budget line moved by a recorded amount, and a test that fails when the order is not written.

**Files.** src/core2/modules/executive.ts, data/research/executive/executive-powers-2026.json, src/core2/emergency-declaration.test.ts

**Notes.** Evidence in docs/design/scenes/from-life/disaster-first-hours.md. Lead laws-effects. Words does not build engine records.
