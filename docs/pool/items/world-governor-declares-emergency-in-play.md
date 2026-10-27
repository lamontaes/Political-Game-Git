---
id: world-governor-declares-emergency-in-play
title: "A governor's emergency declaration happens in play when a disaster hits, and is recorded with the governor named"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by: 
pr:
blocked-on:
source: words-and-scenes helper D, Oct 27
lead: laws-effects
claimed-at: 
---

**What.** declareEmergency exists in the executive engine, sets the state's cost share on a budget line and records emergency-declared naming the governor, but no code in the game calls it: nothing in a played governor's year declares an emergency even in a year with four disasters. Add the call where the state's own law gives the governor the power: for a player governor an offer on the office screen, for any other the governor's review when a disaster is on record, deciding by the governor's traits and the state's power (the existing emergencyPower), never a fixed chance. Today only the unit test declares one, by hand.

**Rules.** No dice: whether and when a governor declares follows the power the state gives them, their recorded traits and the disaster on record, never a percentage. Wire to the world: the declaration moves a budget line and is read by the budgets engine and by the director. One rule, all 56 places: the state comes from the drawn place.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a year with a recorded disaster in a state whose governor holds the power shows an emergency-declared record naming the governor, the state budget line moved by the recorded amount, and a test that fails when the call is removed.

**Files.** src/core2/modules/executive.ts, src/core2/modules/disasters.ts, src/core2/emergency-declaration.test.ts

**Notes.** Evidence in docs/design/scenes/from-life/executive-record-gaps.md: declareEmergency has no caller outside tests. Lead laws-effects.
