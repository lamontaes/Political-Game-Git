---
id: world-budget-cut-names-the-executive
title: "A budget line the council cuts is recorded naming the executive, so the head of that department can come to them"
area: world
kind: feature
priority: 2
size: S
status: open
claimed-by: 
pr:
blocked-on:
source: words-and-scenes helper D, Oct 27, from scenes-from-life episode budget-cut-department-head; evidence in the first probe of a mayor's year in Riverton, Wyoming, Prospect, Kentucky and East Bend, North Carolina
lead: laws-effects
claimed-at: 
---

**What.** When the council adopts a budget or an amendment that lowers a spending line, the budgets engine records budget-line-changed with no people on it, so no executive ever meets the cut as a scene. In three drawn towns a mayor's played year held 38, 37 and 40 of these records and none named the mayor. Name the sitting executive of that government (the mayor, county executive or governor, a full person) in personIds and add the fact executiveId, for lowering changes only; a raise, and a government with no executive, stay as they are. The director already reads the record through the budget-cut situation type.

**Rules.** Wire to the world: the cut is read by another engine, the director's budget-cut scene, in a played year, and a record nobody reads is a placeholder. No dice: whom a cut names is the office holder on the day, never a roll. One rule, all 56 places: no place is named in the change, and the check draws its place and seed.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a year as mayor shows every adopted cut to a line carrying the mayor in personIds and facts.executiveId, and the director stages the budget-cut scene with the head of that line's department in the chair, citing the record id; src/director/budget-cut-scene.test.ts part 1 is changed to expect this instead of asserting that nothing names the mayor, and a raise names no one.

**Files.** src/core2/modules/budgets.ts, src/director/budget-cut-scene.test.ts

**Notes.** Evidence and the probe are in docs/design/scenes/from-life/budget-cut-department-head.md. Lead laws-effects. Words does not build engine records.
