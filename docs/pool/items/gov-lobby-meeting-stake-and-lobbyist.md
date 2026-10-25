---
id: gov-lobby-meeting-stake-and-lobbyist
title: "No lobbyist weighed a bribe in 416 meetings across four played worlds: each meeting had a lobbyist and no stake, or a stake and no lobbyist (Kingfield, Maine)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Across four drawn places played two years (scripts/research/bribe-chain-years.ts: Enfield, New Hampshire, 894789ccc529a285; Wheatfields, Arizona, 38ded4c5596ad190; Davie, Florida, 694f68f1f5df5250; Wilkeson, Washington, bccec869be3dbd2b), 416 lobbyist meetings with members on bills produced no bribe offer; every offer came from a contract bidder. In Kingfield, Maine (seed smoke-bribe-1, its first month), each meeting had either a group lobbyist with cash and an annual stake of 0, or a stake (176,689 a year) and no lobbyist, and offerBribe in src/core2/modules/interest-groups.ts returns before the corruption engine in both cases. The stake sums only what this bill costs the group's members, while the lobbyist is chosen once, when the group forms (lobbyistFor, a stand-in under SG-GOV-group-lobbyist-stand-in), so a standing group meets members over a bill that costs its members nothing, and a group a bill does cost found no owner willing to serve. Find out which, and make a meeting carry the stake of the employers the lobbyist speaks for on that bill.

**Rules.** No dice. Wire to the world: a lobbyist meeting over a bill that costs the group's employers carries that cost into the lobbyist's case and the bribe decision. One rule, all 56 places. Never weaken a test.

**Done when.** In Kingfield, Maine (seed smoke-bribe-1) and one drawn place (seed named), every lobbyist meeting the interest-groups engine records over a bill that costs the group's members names a lobbyist and a nonzero stake, by meeting id, and the bribe-chain script reports how many of those meetings led the lobbyist to weigh an offer; src/core2/interest-groups.test.ts passes with a case for a standing group meeting over a second bill.

**Files.** src/core2/modules/interest-groups.ts, src/core2/modules/corruption.ts

**Notes.** Filed Oct 25 by the effects lead from gov-bribes-in-played-worlds-measured.
