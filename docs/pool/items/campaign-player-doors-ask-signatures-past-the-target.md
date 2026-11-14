---
id: campaign-player-doors-ask-signatures-past-the-target
title: "The player's doors keep asking for signatures after the petition holds enough (332 against 1)"
area: elections
kind: feature
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

**Fix.** Owner's ruling, Nov 14, 2026, 03:05Z (decision card, "Switch to asking for votes"): once the player's petition holds the target plus a small cushion, the player's doors stop gathering signatures and become vote-asking visits. The cushion is the builder's to propose, from the state's own rules on invalid signatures where the data has them; the engine already keeps one, `signaturesToGather` with `petitionSignatureCushion` (0.5, ESTIMATED, src/core2/data/campaigns/parameters.json), which a world candidate stops at. Use the same rule for the player's walk in `walkWith` and for the porch scene's petition-door test in src/director/doors.ts, so one rule serves player and world. The strip then says "reached" again on those outings, since `campaignDay` reports `answered` only while the doors ask to sign.

**Yield, measured for the next builder (T47, Nov 14).** Signatures per three-hour outing of 45 to 54 doors, 27 daily outings each: Etowah AR (seed c7d7e202d63b5dce5a62bf75695426ce5a566161018b7f974abb1b6fb848f7e7) 0 to 23, median 1, 10 days of none; Maroa IL 0 to 32, median 11, 3 of none; Otisville NY 0 to 24, median 5, 4 of none; Kent Estates IA (seed daa8a59ece8ffa425b1fb70912723a9c1fcc82e42c5f93bfdccd394fad77ad88) 0 to 28, median 16. First outings: Edgar WI (seed 4d8a2d61-6aea-48c7-8043-906d5c563aaa) 34 against a target of 1, Acosta PA (4616f4a0-d9e4-4bc9-8680-9c78f8eed4b0) 23 against 3. Share of opened doors that sign, Otisville's first six outings (src/bench/campaign-doors-answered.test.ts): 66 of 85 answered, 78% (24 of 28, 13 of 16, 8 of 13, 8 of 11, 8 of 10, 5 of 7); yields fall as the walk list reaches less friendly homes. What decides a signature: `askToSign` (campaigns.ts) calls `leanedYes` on `signReason` = warmth + agreement + `donorPartyWeight` x party + `donorRelationshipWeight` x relationship + `petitionSignOpenness` (0.4, TUNABLE, calibrated to practitioners' 10 to 18 signatures an hour), with the traits' lean for `campaigns.sign-petition`. At 15 doors an hour that calibration expects 30 to 54 signatures a three-hour outing, so the rate sits at or under the practitioners' range; the owner's "5 people or 20 people or no people" is mostly the target being small against it, which the ruling above answers. Judge the rate separately only if outings past the switch still look off.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Realism wins; one rule for player and world candidates; no dice.

**Done when.** A second session, on the train or main, sees in the running game that in three drawn places the player's doors ask for signatures until the petition holds the target plus the cushion and ask for votes after, shown in the doors strip and the porch scenes, with the petition's count and the dates in the PR body.

**Waits on.** #9097 on the train (it adds `answered` to the doors strip).

**Files.** src/core2/modules/campaigns.ts, src/director/doors.ts
