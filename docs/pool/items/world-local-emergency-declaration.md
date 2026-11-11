---
id: world-local-emergency-declaration
title: "A mayor or county executive's emergency order is recorded naming them, and gives the departments spending authority against the disaster"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: scene researcher Helper D, Oct 27; scenes-from-life episode disaster-first-hours (a city's mayor signed an emergency executive order within hours of a tornado)
lead: laws-effects
claimed-at:
checked: fable 2026-11-10
---

**What.** The executive-powers table and the executive engine give only a governor the power to declare an emergency; a mayor or county executive has none, though a real mayor's first act after a tornado is an order that gives the departments emergency powers. Add a recorded local emergency order, naming the executive and the disaster record that caused it, available where the state's law gives local executives the power and decided by the executive's traits when they are not the player. The order moves a named budget line toward the response, as the governor's declaration does, so the budgets engine and the departments read it.

**Cause.** Found in code: `declareEmergency` (src/core2/modules/executive.ts line 1540) throws unless the sitting governor declares, and `emergencyPower` (line 1518) reads only the state's researched power; src/core2/data/executive/emergency.json holds only the state budget line. Evidence for the scene is in docs/design/scenes/from-life/disaster-first-hours.md.

**Fix.** Add a recorded local emergency order that names the mayor or county executive and the disaster record, allowed where the state's law gives local executives the power and decided by the executive's traits, that moves a named budget line through `amendBudget`.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: a mayor or county executive's choice to sign an emergency order after a disaster, and the budget line it moves.

**Rules.** No dice: whether and when an executive signs follows the power the state gives them, their recorded traits and the disaster on record, never a percentage. Wire to the world: the order is read by the budgets engine, which moves a line, and by the director. One rule, all 56 places: the power comes from the state's own law in the table and no place is named.

**Done when.** A second session, on main in a drawn place and a seed the builder did not choose, plays a year with a recorded disaster in a place whose law gives local executives the power, and sees a local emergency record naming the executive and the disaster by record id, with a budget line moved by a recorded amount. A test in src/core2/emergency-declaration.test.ts fails when the order is not written.

**Waits on.** Nothing.

**Files.** src/core2/modules/executive.ts, data/research/executive/executive-powers-2026.json, src/core2/data/executive/emergency.json, src/core2/emergency-declaration.test.ts

**Notes.** Evidence in docs/design/scenes/from-life/disaster-first-hours.md. Lead laws-effects. Words does not build engine records.
