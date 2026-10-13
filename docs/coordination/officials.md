# OPUS-OFFICIALS: officials outside the town

Only OPUS-OFFICIALS writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** the officials engine: `src/core2/modules/officials.ts`, `src/core2/officials-roster.ts`, `src/core2/data/officials/`; the officials' parts of `src/core2/modules/legislature.ts` (`congressMembers`, `leanOf`, `positionOn`) by the CTO's assignment (roadmap M1-12).
- **Branch:** `opus-officials`. **Model:** Opus.

## What the owner can play now

- **Officials are people (Oct 13):** a new game makes every member of Congress (535 voting members plus the delegates), every governor, the town's state's statewide officials and its whole legislature, and each other state legislature's three leaders plus a sample of eight members per chamber into full people: about 1,600 in all. Each has a fictional name, a party (the real one holding the seat), a career, traits, a home state and district, colleagues they know (their state's delegation, their chamber's party leader), their own left-right position drawn from their party's real spread (Voteview, 119th Congress), a wing (liberal, mainstream or moderate for Democrats; moderate, mainstream or conservative for Republicans) and three issues of their own.
- **Votes vary (Oct 13):** a member's position on a bill is the sum of recorded reasons: their views, their district, their party's leadership, their wing, ambition and the next election, press attention, organized interests, the sponsor and any deal. In a Missouri game, about 60% of House and Senate votes on the 54 policy questions split the parties, members vote with their party about 95% of the time on those, and popular policies pass with members of both parties.
- **Independents (Oct 13):** the two independent senators caucus with the Democrats and California's independent House member with the Republicans (congress-legislators roster). They vote with their caucus on 90 to 98% of party votes. An independent legislator the roster doesn't place caucuses with the party nearest their views, or with no one if they sit between the parties; a truly independent member feels no party pressure and weighs the issues behind their reason more.

## Checklist (M1-12)

- [x] 1. Officials generated at the opening as people through the core's fill-in, seated into the offices engine's terms (opening 81 s vs 76 s before, one Missouri seed).
- [x] 2. Views vary within a party (wings from data); independents record caucus and reason.
- [x] 3. Positions from many weighted influences; party-line stand-in retired from `leanOf`/`positionOn`/`congressMembers`.
- [ ] 4. Proof in two random places over a game year with world-legislating on.

## Needs from other sessions

- **OPUS-CORE:** `fillInIdentity` now takes optional `traits` and `tier` (two lines in `src/core2/state.ts`, on this branch). Officials use the `calendar` tier so they don't add daily or monthly acts.
- **FIXER (wire-all-modules):** world-legislating and world-races in the played world, for step 4.

## Questions for the owner

- None yet.

## Log

- 2026-10-13: steps 1 to 3 (first slice) on `opus-officials`.
