---
id: gov-pending-bribe-reported-in-the-players-name
title: "A bribe offered to the player is reported to the prosecutor in the player's name the same day, before the player has seen or answered it (Fruitland, Idaho)"
area: gov
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by: claude/p2-pending-bribe-not-reported
pr: #9014
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: Playtester P2, Nov 13 (Fruitland, Idaho, seed 6c66ce96-86ed-47d7-ad37-063de2ddc0bf)
merged-at: 2026-11-13T06:46:46.953Z
---

**What.** On main 596d5127, in an Advanced start in Fruitland, Idaho (seed 6c66ce96-86ed-47d7-ad37-063de2ddc0bf) as Council member Bianca Guzman, two people offered her money on Saturday, February 1, 2025, during one press of Week. She never saw either offer. Complaints "by" her were filed with the prosecutor that same day (`complaint:bribe:2025-02-01:person_004995f68770ce05:person_017543b14435c24d:contract:place:1628990:highways:2025-02-01:person_017543b14435c24d`). The next morning Matthew Reynolds, who had made the offer, opened an accusation scene: "Matthew Reynolds says you offered them money, and has gone to the prosecutor about it." He was later convicted. Seen: a bribe offered to the player waits for the player's answer, and nothing is reported in their name until they answer.

**Cause.** Found in code: `considerBribe` (`src/core2/modules/corruption.ts`) records an offer to the player's seat as `pending`, to be settled by the player's reply in the bribe-offer scene. The justice engine's `intake` (`src/core2/modules/justice.ts`, line 345) reads every new crime that is `offered && !taken` as a refusal and has the official consider a report (`considerReport(api, crime, crime.officialId, "witness")`). A pending offer is not taken yet, so the player's own report is weighed and filed by the player's traits the same day.

**Fix.** `intake` skips a crime that is still `pending`. The player's answer in the scene settles it, as `corruption.ts` already does (`takePendingBribe`, `refusePendingBribe`). A drawn-place test puts several offers to the player and checks that, three days on, no complaint names the player as its reporter for an offer still waiting.

**Time box.** 1 hour

**Rules.** No dice: the player's own choice settles an offer to the player, and no trait-driven pick stands in for it. One rule, all 56 places: the check is the offer's own pending mark, never a named place or person.

**Done when.** `src/core2/pending-bribe-not-reported.test.ts` passes in two drawn places, and a second session sees, on the bench on main, a drawn Advanced start as a council member played by Week for two months with no accusation scene about a bribe offer the player never answered (dev mode's Trace, or `GET /api/dev/person`, shows no complaint whose reporter is the player).

**Waits on.** Nothing.

**Files.** src/core2/modules/justice.ts, src/core2/pending-bribe-not-reported.test.ts

**Notes.** The scene that followed also cast the reporter as the accused. That is the director's, ruled by Fable A as rule 14 on issue 8928 and given to the Life records builder; it is not part of this item.
