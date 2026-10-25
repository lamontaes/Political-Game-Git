---
id: words-director-claims-shared-rule
title: "The player's claims in a conversation are believed or doubted by the same rule as residents' stories"
area: words
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Residents now believe a story or speech another resident passes on through believesClaim in src/core2/heard-claims.ts: a stranger's pull, plus how close the hearer is to the teller and how well the claim fits the hearer's view, against the trait lean at its researched weight. The player's own claim in a conversation is still judged by doubtsClaim in src/director/conversation.ts, the flat truthDefaultPull against the raw trait lean with no closeness, fit or weight. That is two rules for one decision, registered as SG-TRAITS-director-claims-reader. The director is the Words line's, so the Words session routes doubtsClaim through believesClaim, passing the player as the teller, and removes truthDefaultPull.

**Rules.** Replace, never layer: doubtsClaim keeps its name and callers but returns the shared rule's answer, and truthDefaultPull is deleted. No hand-written player text. No dice.

**Done when.** doubtsClaim in src/director/conversation.ts returns !believesClaim(core, hearer, { tellerId: playerId }); truthDefaultPull and SG-TRAITS-director-claims-reader are removed; src/director/conversation.test.ts passes on a drawn place with a stranger who doubts the player and a close tie who believes the same claim, both named by person id; and in one year of buildBenchWorld in a place drawn from all 56, seed named, the player's lie to a close contact is believed while a stranger with the same temperament doubts it.

**Files.** src/director/conversation.ts, src/director/conversation.test.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json

**Notes.** Filed Oct 25 by the traits lead. PR 5657 made this change on a traits branch and Merger 1 sent it back because src/director edits belong to the Words line; the change was taken out of that PR. The diff it carried was three lines: import believesClaim and HeardClaim from ../core2/heard-claims, make doubtsClaim return !believesClaim(core, hearer, claim) with core picking data, date and relationships, and pass { tellerId: playerId } where say() asks each hearer. Depends on traits-civic-shared-rule merging first, since that adds believesClaim.
