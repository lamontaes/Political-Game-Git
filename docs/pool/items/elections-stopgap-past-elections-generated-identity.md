---
id: elections-stopgap-past-elections-generated-identity
title: "Stopgaps in past-elections (generated-identity): 1 open"
area: elections
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on:
milestone:
after:
size: M
source: "src/core2/data/stopgaps.json, src/core2/past-elections.ts, kind generated-identity"
---

**What.** Replace SG-CORE-past-named-only in buildPriorElections (src/core2/past-elections.ts). The prior election's challenger is a name from pastIdentityName with personId null, and a law's sponsor or signer who left before day one and a seat's earlier holders are names too, so none can be met. Register each such person as a RecordedIdentity (name, birth date, party, place, the seat and the vote they ran in) in the same step that writes the PastCandidate, set the candidate's personId to that identity id, and make personOrFillIn (src/core2/state.ts) fill them in with fillInIdentity when the player meets or looks them up, with the party, the seat, the vote count and share, and the year already written as their past facts. Someone who died or moved before day one is recorded as such rather than filled in as alive in town.

**Rules.** One model, two tiers: a challenger who is a town resident is a counted member filled in by the same rule as anyone, and a person from elsewhere is a recorded identity, never a full person before they are met. No hand-written player text: their words and journal lines come from the English engine. Replace, never layer: personId null for a named challenger is deleted, not kept beside the identity. Ask why: the filled-in person's past cites the prior election row id. Speed: no one is filled in until met or clicked. One rule, all 56 places: the draw uses the place's name data and no place is named.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, the prior election of a town seat names a challenger with a person id, and filling that id in yields a person whose party, race, votes and share match the prior election row, shown by the row id and person id; src/core2/past-elections.test.ts proves it and SG-CORE-past-named-only is resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/past-elections.ts, src/core2/past-bodies.ts, src/core2/state.ts, src/core2/past-elections.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: The prior election's challenger, a law's sponsor or signer who left office before day one, and the predecessors who held a seat are names drawn from the seed, not people of the world.

Oct 20 (pool feeder): spec written; fillInIdentity already exists for state and federal officials (state.ts, with SG-CORE-identity-fill-in-traits resolved), so the work is registering the challengers and predecessors as identities and routing the click through personOrFillIn. The sponsor-or-signer and predecessor names are in past-bodies.ts and the past laws; the builder covers every name that pastIdentityName produces.
