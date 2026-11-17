---
id: world-parties-stand-nominees-where-their-chance-covers-the-cost
title: "In a century world a party stands a nominee in an outside race where its chance of taking the seat covers the cost"
area: world
kind: wiring
priority: 2
size: S
status: in-pr
standard: 2
after: world-challenger-odds-from-the-seats-last-race
pr: 0
blocked-on:
model: sonnet
effort: medium
root: none
source: "CTO, Nov 17, 12:47Z on #9747; History's plan, family 9c (comment 6947526428)"
lead: world
---

**What.** Every state and federal race the town doesn't vote in is counted as the Republican against the Democrat, so both sides contest every seat however lopsided. Seen: any counted outside race in a played world after the first general election.

**Cause.** Found in code: `decide` in `src/core2/modules/voting.ts` built its candidate list from both parties of the seat unconditionally (`parties.map(candidateInputs)`).

**Fix.** In a century world the list holds only the parties whose chance of taking the seat covers what standing a nominee costs (`partyFieldsNominee` in `candidacy.ts`: the normal curve at the seat's lean over the swing spread, against `candidacyPartyStandingCost`, ESTIMATED). A race always keeps at least one side. The town's own statewide races (`fileNominees`) are the next unit. `src/core2/outside-races-field.test.ts` draws places, plays the first general election and checks each race's major-party votes against the rule.

**Time box.** 3 hours.

**Rules.** No dice; the chance comes from the seat's own lean; the cost is a strength with its source and spread.

**Done when.** A second session plays a drawn place past its first general election in dev mode and sees an outside race with one major party's votes only, next to a close race with both (place and seed named).

**Waits on.** The challenger's-odds change (its swing spread).

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/voting.ts, src/core2/data/candidacy/parameters.json, src/core2/outside-races-field.test.ts
