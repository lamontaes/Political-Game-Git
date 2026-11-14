---
id: campaign-player-doors-ask-signatures-past-the-target
title: "The player's doors keep asking for signatures after the petition holds enough (332 against 1)"
area: elections
kind: owner-decision
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: play-petition-signatures-come-from-door-days
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: none
source: Account lead T47, Nov 14 (measurement for play-petition-signatures-come-from-door-days)
claimed-at:
---

**What.** Maroa, Illinois (seed 5477ecc05303e1db3466b0885b425faacbd7df1e7d0fd2eae0e59fc1b10f4f9a, train at d488834f plus #9039 and T47's branch): the player files for a board seat on Sep 8, 2025 whose petition needs 1 signature, then knocks doors daily for 27 days. Every door asks for a signature, and the petition holds 332 against 1. Otisville, New York: 221 against 23. A world candidate stops petitioning at the target plus the clerk's cushion (`signaturesToGather`, src/core2/modules/campaigns.ts) and its day turns to the voters. The player's doors never switch.
Seen: the doors outing's "{n} signed" and the porch scenes, which stay signature asks all month.

**Cause.** Measured: Maroa, Illinois, seed 5477ecc05303e1db3466b0885b425faacbd7df1e7d0fd2eae0e59fc1b10f4f9a, 332 signatures against 1 after 27 days of doors (Otisville, New York, seed 580915c55b122496eedbb4aef26193e639a89d50e6df380c1a1073abc59559a5: 221 against 23). src/core2/modules/campaigns.ts `walkWith` asks every door to sign while `petitionCirculating` (until the due date), whatever the petition holds; src/director/doors.ts marks every door a petition door on the same test.

**Fix.** Needs the owner's call: once the player's petition holds what the law asks plus a cushion, should the player's doors (a) ask for votes instead, as a world candidate's do, (b) keep asking for signatures until the player hands the petition in, or (c) offer the player a choice of what to ask. Build after the answer; one rule for the player and the world.

**Time box.** 2 hours for one Sonnet session after the owner answers.

**Rules.** Realism wins; one rule for player and world candidates; no dice.

**Done when.** A second session, on the train or main, sees in the running game that in three drawn places the player's doors after the target do what the owner chose, shown in the doors strip and the porch scenes, with the petition's count and the dates in the PR body.

**Waits on.** The owner's answer.

**Files.** src/core2/modules/campaigns.ts, src/director/doors.ts
