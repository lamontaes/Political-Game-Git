# Redistricting under the Voting Rights Act (bank id b16, phase P4)

## What the player experiences

Every ten years the game counts its own people, seats shift between states, and every map has to be redrawn: council wards, state legislative districts and U.S. House districts. Whoever holds the pen draws, as each state's real law says: the legislature, a commission, or the council. If you sit there, the map comes to you as a few real plans you can compare on a map screen. Each district shows how many people it holds, how far it is from even, how it has voted, and the neighborhood make-up the courts look at. You can bargain over lines like any bill, and your own home can be drawn into a colleague's district. Afterward a group of residents can sue, and judges weigh the case the way courts do: are the districts equal, could a minority community have formed a majority district, and does that community vote together while being outvoted. A court can throw the map out. Nobody's race is ever shown on a person. It exists only as the Census counts for a neighborhood.

## Owner decisions this rests on

- Sept 28 #8: "Redistricting: track neighborhoods' racial and language makeup from Census place data and use it the way courts do (Voting Rights Act). It's never a label shown on a person."
- D-6 approved: pardons and redistricting. Sept 28: "Lamontae doesn't know how districts are drawn; maybe pre-drawn plans to choose from."
- "Everything modular and changeable by law"; one rule for all 50 states, D.C. and territories; real data calibrates the start only.
- "Courts issue rulings on real cases and can strike down laws."

## Existing code it must use

- Town wards: `src/simulation/living-world/town-wards.ts:59` `TownWardMap`; `:130` `councilWardPlan`; `:299` `wardCommissionLaw`; `:318` `wardDrawerInForce`; `:330` `wardOfPerson`; `:352` `drawWardCuts`; `:398` `redrawTownWards` (paired members recorded). Streets are HARDWIRED as household order (header at `:38`). Called from `living-world/local-elections.ts:1527` `redistrictAfterCensus`, `:1557` `redistrictForWardCommission`, `:1574` `localGovernmentYearHandler`. Deviation data comes from `data/research/local-government/council-election-methods.json`.
- State and House districts are fixed Census joins: `src/districts/types.ts:13` `DistrictIdentity`, `query.ts:115` `districtMembershipFromCanonicalHome`, `place-membership.ts:182` `placeDistrictJoin`, `:140` `selectDatedSet` (the dated-set pattern used for the 2026 lines, `data/research/district-lines-2026/`). Population per place and district comes from `place-district-population.generated.json` (2020 block counts), with `place-population-share.ts:18`.
- Residents: `src/simulation/district-residence.ts:385` `establishDistrictResidence`, `:664` `syncDistrictMembershipFromCanonicalHome`, `:160` `bindOfficeToDistrict`. Seats: `districts/members-per-district.ts:38` `seatsByDistrict`.
- Apportionment: `src/simulation/apportionment.ts:38` `apportionHouse`, `:88` `electoralVotesFromSeats`. Neither has a gameplay caller.
- Who draws state maps: `policy-pack-us-policy-positions.ts:413` (`government-operations.independent-redistricting`), with real answers in `data/research/laws/starting-law-2026.json:8365`. Nothing reads it.
- Courts: `judiciary/judicial-review.ts:121` `fileJudicialChallenge` and `:329` `justiceVotes` (the pattern for a challenge plus per-judge votes); `judiciary/court-for.ts:50` `courtFor`; precedent rows in `data/research/laws/judicial-review-precedents-2026.json`.
- Map display: `src/maps/political-map-model.ts:515` `projectPoliticalMap`, `:796` `inspectRegion`.
- Population drift: `nationwide-world/place-population.ts:79` `placeReferencePopulation`, `pressure/flows.ts:78` `flowsForYear`.
- No race or language exists on any person (checked `types.ts`), and none may be added.

## What to change

1. **Neighborhood make-up data (compiler, no person fields).**
   - Add a source domain for Census P.L. 94-171 counts at block group: total and voting-age population by race and Hispanic origin. Add ACS citizen voting-age population and the Section 203 language determinations by county.
   - Compile per-state packs loaded on demand, like map geometry. Each unit carries its place and district joins.
   - Unread units are estimated from similar units in the state and marked estimated.
   - Test: the pack totals match the shipped place populations.
2. **The game takes its own census.**
   - In years ending in 0, count each place's people from the world's own population (reference population plus recorded drift and flows). Neighborhood shares drift with the recorded moves, never re-read from 2020.
   - In years ending in 1, call `apportionHouse` over the state counts, then `electoralVotesFromSeats`. Write a dated set that `selectDatedSet` reads, the same way the 2026 lines work.
   - Test: a state that grew gains a seat in a 30-year run.
3. **One plan builder, all levels.**
   - Generalize `drawWardCuts` into a plan builder over building units. A town's units are its block groups in geographic order: households are assigned to block groups in proportion to their populations, replacing the household-order streets. For state and House maps the units are place and county pieces.
   - The builder makes a short list of real plans from distinct goals: even and compact; protect sitting members (today's council rule); most seats for the drawer's party, read from recorded results; and a plan that meets the VRA test in part 5.
   - Deviation limits are data rows: House near zero; state legislative and local from the court record.
4. **Who draws, by law.**
   - Read `independent-redistricting` through `lawInForce`, the same way `wardDrawerInForce` reads the ward law.
   - Where the legislature draws, the chosen plan is a measure through the existing legislative engine and the executive desk, so it can be amended, traded and vetoed.
   - Where a commission draws, its seated members choose through `evaluateDecision`. Each member picks a plan from their own recorded goals, party and the law's criteria.
   - Test: the same world with commission and with legislature produces different maps, each with recorded reasons.
5. **Courts weigh it as courts do.**
   - A map challenge goes through a `fileJudicialChallenge`-style writer: a resident or group from an affected neighborhood (b18 groups) files it.
   - Federal maps go to the court `courtFor` returns, with a three-judge panel where federal law requires one (a research row).
   - Each judge's considerations, measured, never assumed:
     - equal population (deviation);
     - Gingles 1: could a compact district hold a minority citizen voting-age majority, measured from the units;
     - Gingles 2 and 3: does the community vote together while bloc voting defeats its choices, measured by comparing precinct results across neighborhoods of different make-up (Session 13's precinct results). Never from any person's race;
     - the judge's outlook (b13);
     - precedent rows, including Rucho for partisan claims in federal court and state constitution rows for state courts.
   - Remedy: a redraw ordered, or a court-chosen plan.
6. **The player's screen.** A plan comparison on the political map: per district, people, deviation, past vote, neighborhood make-up as district totals, and which incumbents are paired. Choices go through the existing vote and negotiation surfaces (Session 21 votes).

## Must NOT build

- Any race, ethnicity or language field on a person, or shown on a person card.
- Dice, or a fixed share of districts that "must" be majority-minority.
- A hand-drawn map tool.
- A second legislative path for map bills.
- A second court engine.
- Per-state hand-coded maps.
- A yearly redraw tick: maps are drawn only on census years or when a law or ruling requires it.

## Done when (proof in a played game)

- A 30-year watched run in a random state shows: the in-game census; a House seat gained or lost from the game's own counts; the legislature or commission (per that state's law) choosing among printed plans with reasons; one challenge filed by named residents; and judges voting with the Gingles measurements printed.
- A council player sees a ward plan screen in a random town and is paired with a colleague under one plan.
- Grep shows no race on `Person`.
- Tests: `redistricting-plans.test.ts`, `census-count.test.ts`, `map-challenge.test.ts`, and `town-wards` updated (block-group units).

## Depends on

- Session 13 (precinct results, elections on new lines).
- Session 21 (votes) and Session 23 (the governor's desk for map bills).
- b13 (judges' outlook).
- b18 (groups that sue).

## Open questions for the owner

1. When the legislature draws, how many plans should a player in that legislature see? (a) 3–4 ready-made plans to pick and bargain over (recommended); (b) those plans plus moving one neighborhood at a time; (c) one leadership plan to vote yes or no on.
