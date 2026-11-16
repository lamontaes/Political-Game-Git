---
id: gov-player-seat-changes-whether-the-chair-holds-a-bill
title: "A bill is held in committee or not depending on whether the player sits in the chair's seat"
area: gov
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "the Account lead, Nov 16: found by the committees thread while playing the chair's side of a hold; the lead calls the player's presence changing a chair's hold serious"
claimed-at:
after:
lead: laws
model: opus
effort: medium
root: rc3-thin-life-record
---

**What.** A committee chair's hold on a bill happens in a world where the player is not the chair and does not happen when the player controls the chair's seat from day one, so a player who sits where the hold would be never meets the sponsor's ask. The world differs by who plays, which a played world must not. Seen: Texas (place 4846968, world seed 8647-mason), where the Senate bill sponsored by upper seat 004 is held by the lower chamber's chair, seat 059, on Feb 18, 2025, unless the player is seat 059.

**Cause.** Needs cause. Measured: at place 4846968, seed 8647-mason, (run A) with no player life, only `director.watch` on seat 059 and `advanceCore` to Feb 20, 2025, the world writes `bill-held-in-committee` for the upper 004 bill on 2025-02-18 with chair `official:term:seat:US-TX:lower:059:0:2025-01-20`; (run B) with `core.playerId` set to that same seat and the days played by `advancePlayerV1` with the first offered choice through Mar 30, 2025 (`src/director/hold-chair-sought.test.ts`, the retired chair-as-player probe), the world writes no hold of the committee on any bill. What differs between the two runs is not measured.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** No dice: nothing the player's seat is should decide what a chair does. A fix must not special-case the player.

**Done when.** In a played world test at Texas (4846968, seed 8647-mason, buildBenchWorld) the hold of the upper 004 bill is written on the same day with and without the player in seat 059; a second session on main, in a place and seed it names, sees a chair's hold unchanged when the player takes the chair's seat.

**Waits on.** Nothing. Feeds: gov-chair-as-player-meets-sponsors-ask-by-presses.

**Files.** src/core2/modules/legislature.ts; src/core2/player-v1.ts
