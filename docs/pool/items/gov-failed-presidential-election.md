---
id: gov-failed-presidential-election
title: "A presidential election that elects no one: the contingent election"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "split from gov-empty-race-holdover"
---

**What.** In `world-races.ts` the presidency is won in the electoral college. When no ticket reaches a majority (for instance a tie or a third candidate holding the balance), the Twelfth Amendment's contingent election applies: the House chooses the president by state delegation and the Senate the vice president. Build it from the law as data, run by the chambers' own members, recorded like any other result.

**Rules.** No dice (members' traits, party and ties decide); sourced citation for the rule; replace, never layer.

**Done when.** A test that forces an electoral-college split resolves through the chambers with a recorded vote per delegation; a played year never fires it unless the vote split.

**Files.** src/core2/modules/world-races.ts

**Notes.** Lower priority than the holdover work: the played golden path has not produced a split.
