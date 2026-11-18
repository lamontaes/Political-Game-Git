---
id: elections-voter-registration-record
title: "Voters are registered or not, at an address, and a move leaves the old registration behind"
area: elections
kind: feature
priority: 2
size: L
status: in-pr
standard: 2
claimed-by:
pr: 9323
blocked-on:
source: "coordinator, Nov 14, after the polling-place scene items found no cause behind a problem at the polls"
lead: elections
claimed-at:
after:
model: opus
effort: medium
root: design-story-director
---

**What.** Every adult in town has a registration the engine keeps: on the rolls or not, at which address, since when, and how. A move leaves it at the old address until the person registers again, after a wait that comes from their own sense of duty; a state with automatic registration registers them at the move, and a state with same-day registration lets them register at the polls. On election day a person not on the rolls registers and votes where the state allows it, or is turned away, and the day keeps a record of each. A precinct is assigned to a household and kept until a move on record changes it. Seen: in who is turned away at the polls and who registers there, with the record behind each.

**Cause.** Found in code: `precinctMap` in src/core2/modules/voting.ts read a voter's polling place from the sorted order of the town's households on every call, so it shifted whenever a household came or went, and `electionLawTurnoutCost` in src/core2/law-reach/group-a-voting.ts subtracted flat cost parts for automatic and same-day registration and logged "registers-at-polls" for everyone on the roll; nothing kept who was registered, so nobody could be unregistered, at an old address or at the wrong place.

**Fix.** Registration rows and the monthly review in src/core2/electorate-registration.ts and src/core2/modules/voting.ts; the turnout rule reads them in `decideTurnout` and divides the calibrated propensity by the survey's registered share; the flat automatic and same-day parts leave the town's cost (places counted from afar keep them); the precinct is kept in the household precinct rows. The opening is drawn already in motion: the share who keep off the rolls is the survey's by state and age band (CPS, November 2024), and a person who moved lately is still at the old address by the same wait rule.

**Time box.** 8 hours.

**Rules.** No dice: nobody's registration is rolled; their own duty sets the wait and the survey's share is spread over people from their id as a starting carry is (`no-dice`). One model, two tiers: a counted record reads the same wait rule as a share times its weight (`one-model-two-tiers`). Estimate, never UNKNOWN: the wait and the deadline are tagged estimates until `research-registration-lag-source` finds a source (`estimate-not-unknown`). An effect is a read, not a record: the turnout rule, the polling place and the law's record read the rows (`wire-to-the-world`).

**Done when.** A second session, in a drawn place's played world (place and seed named, any of the 56), finds the town's registered share within a few points of the survey's for its state, a named person who moved lately registered at the old address until the wait ends and then at the new one by record id, an election day whose poll-day record names who registered at the polls or was turned away, and a household's precinct unchanged after another household arrives.

**Waits on.** Nothing.

**Files.** src/core2/electorate-registration.ts, src/core2/modules/voting.ts, src/core2/law-reach/group-a-voting.ts, src/core2/data/campaigns/parameters.json

**Notes.** No player lines in this item: scene-trouble-at-the-polling-place and words-run-poll-problem-lines-are-composed build on the poll-day record. No provisional ballot (an owner-decision for the polling-place scene item).
