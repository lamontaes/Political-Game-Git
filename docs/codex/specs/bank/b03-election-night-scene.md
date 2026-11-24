# Election night with your people, precinct by precinct (bank id b03, phase P1 council journey)

**Hand to Session 13.** This is the detailed done-definition for Session 13's part 4 ("election night as a scene, results by precinct"). It adds no second engine; Session 13 stays the one writer of counts and results.

## What the player experiences

On election night you are somewhere real: your living room for a small race, a rented room or the campaign storefront if the campaign could pay for one. The people in the room are the people who are actually in your life: who you live with, family and close friends nearby, and the volunteers and staff still working for you. The results come in precinct by precinct on the TV or the clerk's website: the small precincts first, then the bigger ones, each with its own numbers, so you watch a lead grow or slip. People in the room react in their own way as the numbers land. When the last precinct is in, you give a victory speech or call your opponent, in front of the same people. You can watch it all or jump to the end.

## Owner decisions this rests on

- "Election night: a scene with your people, results precinct by precinct."
- "Crowds: real people up front, a crowd sized by real turnout behind."
- Depth is optional; zero dice; one rule for all places.

## Existing code it must use

- `src/simulation/election-contests.ts:177 countRecordedVoterBallots`: each voter's ballot through `evaluateDecision` (`randomness: "none"`, :304-311); returns only totals (:321-333).
- `src/simulation/living-world/local-elections.ts:1146` (caller), `:1163 localElectionCountHandler` (Session 13 is folding all levels into the contest path).
- `src/presentation/national-election-results.ts:16 projectNationalElectionResults`: reads `unit-result` records with `unitKey` (:31): the existing results-by-unit pattern to reuse for every level.
- `src/simulation/speech-reception.ts:119 electionNightWitnesses`: who is in the room (household, family and close friends in the same place, active campaign staff). `:146 speechReactionOf`: each witness's reaction from reasons.
- `src/simulation/campaign-speeches.ts:42 ELECTION_NIGHT_LOCATION_KEY`, `:155 recordElectionSpeech`; `src/presentation/place-backdrops.ts:277 electionNightLocationKey`; `src/player/PlayerGame.tsx:1619` (election night overrides the home backdrop).
- `src/presentation/backdrop-surfaces.ts:568-600 readResults`: the room TV shows a decided count for three days.
- `src/presentation/campaign-projection.ts:233 displayedSharePercents`: shares that add to 100.
- `src/simulation/campaigns.ts:2099 closeCampaignAfterElection`: ends staff work at `result.resolvedAt` (:2136-2152) BEFORE the player gives a speech, so `electionNightWitnesses` (active staff only, :127-133) drops the player's own staff from the room. Bug to fix here.
- `src/simulation/district-residence.ts`: the one per-person district membership writer (chamber districts from place joins).
- Gap: no precinct exists anywhere in the code or data; a person is known only by `homeJurisdictionId`.

## What to change

1. **Precincts as a district membership.** Load the Census 2020 voting districts (VTDs) with their population for each place (one data file under `src/districts/`, same shape as `place-district-population.generated.json`). In `district-residence.ts` add a `voting-precinct` membership: at world creation residents of a place are assigned to its precincts in `world.personOrder` order, filling each precinct to its population share (deterministic, no draw); movers are assigned on arrival. A place with one VTD has one precinct. Places with no VTD row get precincts sized by the state's legal maximum voters per precinct (researched, ≤10 min), estimated where unread. Lines change only through the existing redistricting step (`local-elections.ts:1527 redistrictAfterCensus`).
2. **Count by precinct, same count.** Extend `countRecordedVoterBallots` to also return `byPrecinct` tallies (group the same voter loop by membership); the winner and totals are unchanged. Session 13 saves them as `unit-result` rows per precinct with the existing record shape.
3. **Reporting order from the record.** Precincts report in order of ballots cast, fewest first; where the state counts mail or early ballots first (state rule data, estimated where unread), that batch reports first. Nothing is uncertain or invented: the scene reveals the saved count in that order.
4. **The scene.** Through Session 4's scene blocks: place = `ELECTION_NIGHT_LOCATION_KEY` venue (home unless the campaign paid for a room through b02's costs); participants = `electionNightWitnesses`; beats = one per reporting batch, each showing that batch's numbers and running totals on the room TV surface; people react through `speechReactionOf`-style reasons on each beat; last beat = the speech choice (`giveElectionSpeech`). A "skip to the result" choice jumps to the last beat.
5. **Staff stay for the night.** In `closeCampaignAfterElection`, end staff work the day after the result, so they are active on election night; update the witness test.
6. **Crowd.** For a rented venue, the background crowd size reads the precinct turnout record; named people up front only.

## Must NOT build

- A second count, a projection or forecast, or a "too close to call" built from chance.
- Fake partial results or rounding that changes the winner.
- Authored election-night lines; a fixed list of who attends.
- A precinct system outside `district-residence.ts`, or a place special case.

## Done when (proof in a played game)

- Random town, random state, council race: on the night, the scene opens at home with the player's household, nearby family/friends and active volunteers by name; at least two reporting beats with precinct numbers that sum to the final count; the speech is given in the same room; skip works.
- Random large city: many precincts, mail batch first where the state counts it first.
- Tests: `election-contests.test.ts` (byPrecinct sums equal totals; same save → same order), `district-residence.test.ts` (every resident in exactly one precinct; same seed → same assignment), `speech-reception.test.ts` (staff present on election night), loop over all 56 places that every resident gets a precinct.

## Depends on

Session 13 (one contest path, results records, oath), Session 4 (scene blocks), b02 (venue cost, staff), Session 14 (TV surface look).

## Open questions for the owner

None.
