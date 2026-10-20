# OPUS-OFFICIALS: officials outside the town

> **History.** This describes the old engine or a process that ended in October 2026. Don't follow it; read `AGENTS.md`, `ARCHITECTURE.md` and `docs/README.md`.

Only OPUS-OFFICIALS writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** the officials engine: `src/core2/modules/officials.ts`, `src/core2/officials-roster.ts`, `src/core2/data/officials/`; the officials' parts of `src/core2/modules/legislature.ts` (`congressMembers`, `leanOf`, `positionOn`) by the CTO's assignment (roadmap M1-12).
- **Branch:** `opus-officials`. **Model:** Opus.

## What the owner can play now

- **Officials are people (Oct 13):** a new game makes every member of Congress (535 voting members plus the delegates), every governor, the town's state's statewide officials and its whole legislature, and each other state legislature's three leaders plus a sample of eight members per chamber into full people: about 1,600 in all. Each has a fictional name, a party (the real one holding the seat), a career, traits, a home state and district, colleagues they know (their state's delegation, their chamber's party leader), their own left-right position drawn from their party's real spread (Voteview, 119th Congress), a wing (liberal, mainstream or moderate for Democrats; moderate, mainstream or conservative for Republicans) and three issues of their own.
- **Votes vary (Oct 13):** a member's position on a bill is the sum of recorded reasons: their views, their district, their party's leadership, their wing, ambition and the next election, press attention, organized interests, the sponsor and any deal. A member's own view is their lean plus how widely state legislatures have already made the policy law; their district reads the polls. Over the 54 policy questions in a Missouri game, 47 to 49 votes split the parties in each chamber, members side with their party 96 to 97% of the time, and settled, widely adopted policies draw both parties.
- **Independents (Oct 13):** the two independent senators caucus with the Democrats and California's independent House member with the Republicans (congress-legislators roster). They vote with their caucus on 90 to 98% of party votes. An independent legislator the roster doesn't place caucuses with the party nearest their views, or with no one if they sit between the parties; a truly independent member feels no party pressure and weighs the issues behind their reason more.

- **Named challengers (Oct 13, second session):** when nobody in town files against a state or federal incumbent, the other party's candidate is a person from the world: an officeholder one step down the ladder in that state (state legislators for the U.S. House and statewide offices; House members and statewide officers for the Senate and governor) or a newcomer, whoever has the strongest reason (ambition from traits, how near their views sit to the seat's electorate, a record to run on). Someone whose own seat is on the same ballot stays in that race. A winner keeps their views in the new seat, and the seat they held below goes to its vacancy rule. The presidency still draws a named stand-in.
- **Vetoes and overrides (Oct 13):** a governor or president signs or vetoes from their own reasons (views, their state, press, traits, organized interests), not their party. A veto now goes to its own override roll call, where every member decides again and members of the executive's party weigh standing with them.
- **Leaders' agendas (Oct 13):** a floor leader who is an official brings the bills they themselves want most, their own causes included.

## Checklist (M1-12)

- [x] 1. Officials generated at the opening as people through the core's fill-in, seated into the offices engine's terms (opening 81 s vs 76 s before, one Missouri seed).
- [x] 2. Views vary within a party (wings from data); independents record caucus and reason.
- [x] 3. Positions from many weighted influences; party-line stand-in retired from `leanOf`/`positionOn`/`congressMembers`.
- [x] 4. Proof over a game year with world races and legislating switched on (`node --import tsx src/core2/tooling/officials-year.ts <seed> [placeKey]`), until FIXER's wiring puts them in `/play`:
  - **A Mississippi town (place 2849520, seed officials-proof-1):** the legislature repealed public broadband 80–42 and the state income tax 78–44 (two Republicans voted no, and one state senator) and enacted term limits 81–41. Congress: stand-your-ground 222–211 in the House (3 Democrats yes), right-to-work 221–212 (2 Democrats), voter ID 221–212 and 54–46 in the Senate (1 Democrat); each died at the Senate's 60-vote cloture. The town's truly independent state representative (caucuses with no one, "between the parties") voted no, yes, no, yes on the four state bills.
  - **The same town, another seed (officials-proof-3):** different people, different votes: term limits passed 79–43 instead of 81–41, the House's stand-your-ground vote was 219–214 with no Democrats, and the independent representative caucuses with the Democrats this time and voted no on all four.
  - **An Idaho town (place 1616120, seed officials-proof-2):** the legislature repealed same-day registration, Medicaid expansion (34–1 in the House, one Republican no) and restored voting after a sentence; the federal votes split 220–213 to 223–210 with 1 to 4 Democrats crossing.
  - **Independents:** both caucusing senators voted with the Democrats on every federal bill in all three games; the California independent with the Republicans.
  - **Speed:** same place and seed on main versus this branch: opening 61 s and 61 s, year 566 s and 550 to 574 s (no slowdown); memory after the opening 3.55 GB on main against 3.6 to 3.8 GB here. Officials use the `calendar` tier and never act on their own.
  - [x] 5. Named state and federal challengers from the officials; override roll calls; leaders' agendas from their own stances; officials seated before filing in the played world (`src/bench/world.ts`).
  - **Not yet in `/play`:** world races and legislating are installed by FIXER's `fixer/wire-all-modules`. Officials themselves are in `/play` now: `openLegislature` seats them.

## Needs from other sessions

Verified on main by `gov-needs-officials-32` (Oct 15); each line is struck with where it is built, or has a pool item.

- ~~**OPUS-GOV (review):** `voting.ts` `fileStandingCandidates` asks `officialCandidate`; `legislature.ts` `executiveAction` holds an override roll call; `world-legislating.ts` `bringAgenda` reads an official leader's own stance.~~ Built: `overrideVote` is called from `executiveAction` (`legislature.ts`), and `filerOf` in `world-legislating.ts` reads `officialStance`.
- ~~**OPUS-PLAY (review):** `src/bench/world.ts` opens officials right after offices.~~ Built: `openOffices` then `openOfficials` in `src/bench/world.ts`.
- **OPUS-GOV:** presidential challengers are still drawn stand-ins: `inaugurate` in `world-races.ts` seats a drawn identity, not the winner. Pool item `gov-inauguration-seats-winner`.
- ~~**OPUS-CORE:** `fillInIdentity` takes optional `traits` and `tier`.~~ Built: `fillInIdentity` seeds the opening temperament for the person it fills in (`src/core2/state.ts`).
- ~~**FIXER (wire-all-modules):** world-legislating and world-races in the played world.~~ Built: `openWorldLegislating` and `openWorldRaces` are installed in `src/bench/world.ts`.
- ~~**OPUS-GOV:** the offices engine files Idaho's House as 35 seats, one per district, but each district elects an A and a B seat.~~ Fixed in `src/core2/offices-state.ts` (`rosterDistricts`): a district whose roster names lettered seats ("10A", "10B") files all of them, read from data. Idaho's House is 70 seats; a test draws such a chamber from the roster data.
- ~~**OPUS-GOV:** world-legislating's leader brings what they themselves want (`leanOf`), not their party's side at a fixed scale.~~ Built: `filerOf` reads `leanOf`.

## Next (my area)

- Donors: each official's donor coalition (OpenSecrets sector shares by party) as a weighted reason on bills that touch those sectors.
- A second, social dimension of views (The Political Process keeps economic and social ideology), with questions tagged by domain.
- Officials who retire, run for higher office and lose (with OPUS-GOV's races): the people stay, with their careers.

## Questions for the owner

- None yet.

## Log

- 2026-10-13 (second session, evidence): played-world passes on two fresh seeds (Calais, Maine 16/0; Pattison, Mississippi 15/0) and two earlier ones; 13,867 of 13,872 legislative votes over five played years carry a trait lean; 72 of 96 roll calls are not pure party line; a Mississippi Republican governor vetoed a bill that passed with every Democrat, on his state's lean and the press; named challengers in every seed. Speed on Calais: main 136 s, branch 151 s (+11%). Found and fixed a doubling: each member of Congress's vote was a separate news story in the town (record.ts).
- 2026-10-13 (second session): merged main (keeps main's trait lean beside the officials' reasons; the stand-in party lean in `leanOf` stays retired). Named state and federal challengers, override roll calls, leaders' own agendas. No sub-agents ran.

- 2026-10-13: steps 1 to 3 (first slice) on `opus-officials`.
- 2026-10-13: members read policies the way legislatures do (adoption share), caucusing independents sit in their caucus's range, officials test in a random place, year proof in two places plus a second seed (step 4). No sub-agents ran.
