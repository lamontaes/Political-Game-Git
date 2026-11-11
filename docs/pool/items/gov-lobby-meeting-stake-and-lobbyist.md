---
id: gov-lobby-meeting-stake-and-lobbyist
title: "No lobbyist weighed a bribe in 416 meetings across four played worlds: each meeting had a lobbyist and no stake, or a stake and no lobbyist (Kingfield, Maine)"
area: gov
kind: bug
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on:
standard: 2
model: opus
effort: medium
lead: governing
root: none
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** Across four drawn places played two years (scripts/research/bribe-chain-years.ts: Enfield, New Hampshire, 894789ccc529a285; Wheatfields, Arizona, 38ded4c5596ad190; Davie, Florida, 694f68f1f5df5250; Wilkeson, Washington, bccec869be3dbd2b), 416 lobbyist meetings with members on bills produced no bribe offer; every offer came from a contract bidder. In Kingfield, Maine (seed smoke-bribe-1, its first month), each meeting had either a group lobbyist with cash and an annual stake of 0, or a stake (176,689 a year) and no lobbyist, and offerBribe in src/core2/modules/interest-groups.ts returns before the corruption engine in both cases. The stake sums only what this bill costs the group's members, while the lobbyist is chosen once, when the group forms (lobbyistFor, a stand-in under SG-GOV-group-lobbyist-stand-in), so a standing group meets members over a bill that costs its members nothing, and a group a bill does cost found no owner willing to serve. Find out which, and make a meeting carry the stake of the employers the lobbyist speaks for on that bill.

**Cause.** Found in code: src/core2/modules/interest-groups.ts sets lobbyistId once when a group forms (line 341, lobbyistFor at line 462, stand-in SG-GOV-group-lobbyist-stand-in), while function offerBribe (line 399) returns at once when the stake is zero or less; measured across four played places by scripts/research/bribe-chain-years.ts (416 meetings, no offer).

**Fix.** Make each lobbyist meeting carry the cost the bill puts on the employers the lobbyist speaks for, per bill rather than per group at formation. First find which side is empty, the owner lookup or the per-bill cost, and fix that one.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice. Wire to the world: a lobbyist meeting over a bill that costs the group's employers carries that cost into the lobbyist's case and the bribe decision. One rule, all 56 places. Never weaken a test.

**Done when.** A second session, in Kingfield, Maine (seed smoke-bribe-1) and one drawn place (seed named), finds every lobbyist meeting the interest-groups engine records over a bill that costs the group's members naming a lobbyist and a nonzero stake, by meeting id, and the bribe-chain script reports how many of those meetings led the lobbyist to weigh an offer; src/core2/interest-groups.test.ts passes with a case for a standing group meeting over a second bill.

**Waits on.** Nothing.

**Files.** src/core2/modules/interest-groups.ts, src/core2/modules/corruption.ts

**Notes.** Filed Oct 25 by the effects lead from gov-bribes-in-played-worlds-measured.

Deferred Oct 25: nothing on screen reads it yet. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). Tuning why lobbyist meetings end in bribe offers; bribes arising from causes is covered by gov-a-background-year-with-a-full-chain.
