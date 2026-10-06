# Petition signatures where the place requires them (bank id b01, phase P1 council journey)

## What the player experiences

When the clerk tells you your race needs signatures, you go out and get them. The first few are played: you ask your neighbor, your coworker, a stranger outside the grocery store, and each answers from who they are and what they think of you. After that you set "gathering signatures" as your standing campaign routine and the game does the rest in the background, along with any friends or volunteers you have recruited. You see your own running count, not a perfect one. At the clerk's counter some signatures turn out to be no good (not registered, wrong district, signed twice), so a careful candidate gathers extra. Where a place asks only for a fee, or lets you pay a fee instead, there is no petition at all.

## Owner decisions this rests on

- "Signatures: a few played scenes, the rest background, where the place requires them."
- "Files at the clerk's office (a conversation that teaches the campaign)."
- "You usually start alone; recruit friends, family, volunteers."
- Zero dice; nothing blank or unknown; one rule for all 50 states, D.C. and the territories.

## Existing code it must use

- `src/simulation/candidacy.ts:499 candidacyEligibility`: the one filing gate; today it has no fee or signature field.
- `src/simulation/campaigns.ts:594 fileCampaign` (gate at :617): refuses a filing the gate refuses; no petition step today.
- `src/source/domains/state-office-qualifications/types.ts:35-44 QualificationField`: no FILING_FEE / PETITION_SIGNATURES yet (queued brief Q1 part 1 adds them).
- `src/simulation/campaign-life-activities.ts:1240`: guidance says `petitions: NOT_ESTABLISHED(...)`; `:1259` tells the player nobody knows. This violates "nothing unknown" and is replaced.
- `src/simulation/municipal-election-rules.ts:349 PetitionSignatureBase`, `:366 PetitionThreshold`, `:392 resolveRequiredSignatures`: the existing threshold math (percent of a named base, round up). Reuse for percent-based candidate petitions.
- `src/simulation/recall.ts:427 recallResidentViews`, `:538 recallPetitionClosesHandler`: the existing petition pattern (eligible residents via `issue-record.ts:343 isEligibleVoterIn`, count against the threshold). Candidate petitions differ: a signature exists only when someone was actually asked and signed.
- `src/simulation/campaign-routine.ts:49 CAMPAIGN_ROUTINE_WORK` (outreach, fundraising), `:200 setCampaignRoutine`, `:325 campaignRoutineBlockAt`: the standing routine. Background signature gathering is a new routine work kind here.
- `src/simulation/campaign-contact-calibration.ts:44 modelCampaignFieldReach`: how many people a block of time reaches; volunteer minutes add.
- `src/simulation/decisions.ts evaluateDecision` with `randomness: "none"`: the signer's choice.
- `data/research/elections/party-nomination-rules-2026.json` `places[*].filing.deadlines2026`: filing deadlines that end circulation.

## What to change

1. **Petition terms in the one gate.** If Q1 part 1 has landed, read its `eligibilityFor(...).signatures`; otherwise add it there (do not build a second reader). Shape: `{required: number | {percent, base}, alternativeToFee: boolean, circulationOpens, deadline, sameDistrictOnly, onePerSigner}`. Unread state/office: take the median of the same office family across read states, mark the row estimated in data (never in player text), never refuse for lack of research. Replace the two `NOT_ESTABLISHED` lines in `projectCampaignGuidance` with these values.
2. **A signature is a dated event.** New `src/simulation/candidate-petitions.ts`: `askToSign(world, {campaignId, circulatorPersonId, signerPersonId, at})` runs `evaluateDecision` (options sign / decline) from the signer's saved view of the candidate (`viewOfOfficial`), relationship warmth with the circulator, party lean vs the candidate's, and traits through the shared trait reader. Writes `campaign.petition-signed` or `campaign.petition-declined` via `recordWorldEvent` (signer + circulator as participants). No new record list.
3. **Played asks.** Expose `askToSign` as a choice Session 4's situation reader can offer when the player is with an eligible person during circulation (door scenes from Session 22, work, home). No authored lines; the request and reply go through `composeGroundedLine`.
4. **Background gathering.** Add `petition` to `CAMPAIGN_ROUTINE_WORK`. When a routine block or a helper's shift completes, `modelCampaignFieldReach` gives the number reached; the people reached are the next residents of the district in `world.personOrder` order seeded by the block's stable key (selection only), skipping anyone already asked; each goes through `askToSign`. Helpers (b02) circulate on their own recorded hours.
5. **Clerk verification.** At filing (Session 13's clerk conversation / Q1 part 4), count signed events: valid only if `isEligibleVoterIn` on the filing date, inside the district, first signature by that person. The clerk states valid/invalid counts and reasons; short → refused with the shortfall; filing gate passes only with enough valid signatures (or the fee where it is an alternative).
6. **Player count.** The campaign screen shows "signatures you have" (all signed events), never the valid count before the clerk checks.

## Must NOT build

- A second eligibility reader or a second filing path beside `candidacyEligibility` / `fileCampaign`.
- Any chance a person signs, any "X% of people sign", any fixed invalid rate (invalid comes only from records).
- Authored petition dialogue or a signature mini-game.
- A daily tick over residents; work happens only when a routine block or scene completes.
- State or town special cases; the Kentucky-only pattern in `campaign-compliance.ts` must not be copied.
- Recall/initiative petitions changes (they stay in `recall.ts` and the municipal packs).

## Done when (proof in a played game)

- New game in a random state whose office requires signatures: the clerk names the number and deadline; two played asks happen in a scene; the routine is set to gathering; after two in-game weeks the count rises from background asks with named signers; at filing the clerk reports valid and invalid counts with each invalid reason; a short petition is refused with the shortfall.
- New game in a random fee-only state: no petition is mentioned.
- Tests: `candidate-petitions.test.ts` (same world → same signers; opposer declines; unregistered signer counted by player, rejected by clerk; duplicate rejected), `candidacy.test.ts` (estimated terms for an unread state, never refused for missing research), loop over all 56 places that every elective office returns non-blank petition terms.

## Depends on

Session 13 (clerk conversation, filing), Session 4 (scene choices), Session 22 (door scenes), queued Q1 part 1 (fee/signature fields) and part 4 (clerk encounter), b02 (helpers).

## Open questions for the owner

None.
