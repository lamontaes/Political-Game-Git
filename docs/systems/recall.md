# Recall

`src/simulation/recall.ts` (added 2026-09-23). Voters remove an official
before the term ends: petition, signature threshold, recall election.

## What is read from law

`municipalRecallRule(governmentKey)` reads through the authorized resolver
`resolveMunicipalRecallRule` in `municipal-ballot-rules.ts`, the only reader
of the municipal rule packs: doctrine, petition threshold, circulation window
and whether grounds are required, each labeled `state-law-unverified`. Where a
state has no pack or its pack does not settle the doctrine or window, it is
drawn from the range the read states span, stable per state, and labeled
`national-range-drawn`. `prohibited` and `judicial-cause-removal-trial` refuse
with a reason.

## Records

State is derived from public events tagged `recall/v1`:
`civic.recall-petition-started`, `civic.recall-petition-closed` (outcome
`qualified`, `failed` or `lapsed`) and `civic.recall-election-held` (outcome
`removed`, `retained` or `lapsed`, tally as shares of 10,000). Two due items
drive it on the ordinary clock: `civic:recall-petition-closes` and
`civic:recall-election`, registered with the campaign transition handlers.
A removal ends the seat's organization participation with the context
"Removed by recall."

## Placeholders, pending `recall-of-officials-52`

`RECALL_PROFILE`: qualification is a keyed draw (35%), the yes share is drawn
from 30% to 65%, the election is 75 days after the petition closes,. The draws are exported
(`recallPetitionQualifies`, `recallYesShare`) so tests can reason about them.

## Not modeled, with the blanket rule applied

1. Recall of state officers, legislators and judges: not offered.
2. Grounds: recorded as required where the law says so; nothing tests them.
3. Replacement: every doctrine is a bare keep-or-remove question; the seat
   stays empty until the next regular election.
4. Petitioners other than residents, and the world starting a recall on its
   own (there is no recorded measure of how people feel about an official).

## Player route

The Recall section of the municipal workspace (`src/presentation/recall.ts`,
`MunicipalWorkspace.tsx`) lists seated officials in the player's home town
with a Start button or the reason it is refused, and a line per petition.

## Changed by law (added 2026-09-23)

A statute or state amendment can change the doctrine through the
`municipal.recall.doctrine` rule field (`docs/systems/enacted-rule-changes.md`).
The rule is read when a petition starts; a refusal under an enacted doctrine
names the law ("Towns in Nebraska cannot recall their officials since
Proposed Amendment (2031): Recall of town officials.").
