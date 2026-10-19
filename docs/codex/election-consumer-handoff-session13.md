# Election consumers reuse filing and saved results

Petition, campaign-helper and loss features can read the existing filing and result records. A qualification age estimate does not establish a petition requirement. Campaign staff remain active on election night and close through the next day's saved clock item.

## Session 26: filing requirements

Inspected at current main base 47c2ecb0eb9984be6c4f30696eb4daf56a0b88fd: `src/simulation/candidacy.ts` exports `candidacyEligibility(world, {personId, jurisdictionId, officeKey, alreadyACandidate, districtBinding?, municipalSeatKey?})`. Its office-scoped qualification includes minimumAge, residency, termYears and filing, each retaining the existing RuleValue discriminator and source. There is no typed petition-signature threshold or fee field in this interface. Do not turn an unknown filing RuleValue into a required petition or derive signatures, fees or residency from the municipal age donor.

candidacyPackForJurisdiction(jurisdictionId) is a general jurisdiction pack reader; local office eligibility must use the exact office reader above. localGoverningBodiesForJurisdiction(jurisdictionId) identifies actual municipal/county offices. fileCampaign(world, FileCampaignInput) remains the canonical filing writer, with actual officeKey, explicit seat bindings, electionDate, candidate/rival/staff IDs and existing cost entities.

Published draft #2259 head 4fadcaf5c968323be46452e3c3072a3ef9354328 additionally exposes electionClerkSceneOffer(world, playerPersonId, clerkPersonId, officeChoiceKey) in `src/presentation/election-clerk-scene.ts`. Its dated packet preserves calendar.electionDate, calendar.filingDeadline, calendar.filingBasis, qualificationEvidence and nullable recorded clerk presence. This donor is separate from main and must be received explicitly. It does not establish petition terms or grant clerk legal knowledge from employment.

## Sessions 27 and 31: staff and outcomes

Inspected at published READY #2303 head 969577474833b02c24a8213d71ff859f8d77a7d0: campaignForCandidate(world, candidatePersonId) reads the most recent campaign, including a finished one. campaignForContest(world, contestId) joins the actual saved campaign; campaignState(world, campaignId) reads its latest state. Preserve the campaign's contestId and state's saved electionResultId.

electionContestResult(world, contestId) reads the saved canonical result or null. Its winnerPersonId, tallies, resolvedAt, outcomeEventId and id are the outcome authority. A loss is the actual candidate differing from that saved winner; a forecast is never a result. resolveCampaignElectionFromRecordedInput(world, input) requires both the actual supplied winner and tallies, invokes the canonical contest resolver, and closes the active campaign with that result reference. National election outcomes remain separate.

Staff closure is private implementation in `campaigns.ts`, not a consumer writer. On election night it saves campaign:staff-close, due at result.resolvedAt plus one day, with canonical contest/result IDs. The handler is composed by composeWorldTimeHandlers. It re-reads the campaign and actual saved result, then invokes the existing work-status writer on that due date. If the result is received late, it can apply the already-past next-day closure; it never writes a future work status during election night. A staff member already ended is preserved. Consumers read workStatusAt and existing work records; they must not create another staff-closing clock or cancel this due item.

electionNightWitnesses(world, candidatePersonId, contestId) returns recorded household, nearby family/friends and still-active staff, excluding actual deaths. It is not a promise that any new hire is present in a scene.

## Evidence and next work

The staff regression in #2303 verifies actual election-night staff presence, serialization, next-day closure and an already-left worker. The two filing browser routes in #2306 prove age-34 municipal filing and Save/Continue. Neither establishes a played clerk scene, an age-18 council journey or election night. Session 13 retains b03 precinct/count/night production; Session 4 retains central scene/knowledge writes.

## Method

The contracts above were read from actual source and published heads. Petition authority and downstream effects must be admitted through their owners' source fields and existing writers. Direct thread-send tools are unavailable in this environment; the compact delivery receipt is addressed to the three sessions on the existing coordination issue.
