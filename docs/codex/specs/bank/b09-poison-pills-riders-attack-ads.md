# Poison pills, riders and attack ads that read your vote at its worst (bank id b09, phase P4)

## What the player experiences

Bills change on the way through. A colleague who hates your bill can add a part that sounds fine but splits your supporters, so the bill dies; another bolts a pet item onto the budget everyone must pass. You can do the same, within your body's real rules (amendments must fit the bill; many states allow one subject per law). Every vote you cast is kept exactly as the bill read that day, part by part. At election time a rival can take your no on a big bill with one popular part and say "voted against school lunches." Some readings are honest, some misleading, some false; false ones are lies on the record that anyone holding the roll call can catch. You can answer, explain or hit back, and a fact-check reaches the people who read that outlet. Ads can backfire on whoever runs them.

## Owner decisions this rests on

- D-5 approved (Sept 28): "Every recorded vote keeps exactly which provisions were on the table." "Each provision gets a public label and a reason each kind of voter cares." "Computer-run lawmakers amend to pass, sink, force a recorded vote or ride a must-pass bill, within each chamber's real rules." "Opposition research reads votes as honest, misleading or false, and false readings carry the Lie marker. Targets answer, and fact-checks reach their own readers."
- "Ads: positive or attack, target, message, pay for placement; can backfire."
- "Lies: recorded; found out by anyone with contradicting facts; damage by who and their personality."
- Sept 28 overrule: chamber procedure starts as each chamber's real rules and can be changed in game.

## Existing code it must use

- `src/simulation/vote-bundle.ts:197 voteBundle`, `:239 stancesFromVote`: the exact parts a vote decided (D-5 step 1, done; no consumer outside tests).
- `src/simulation/provision-public-face.ts:33 publicFaceOfPart`, `:89 whoCaresAbout` (D-5 step 2, done).
- `src/simulation/governing/amendment-authors.ts:378 planFloorAmendment` (motives pass/sink/record/ride), `:597 offerPlannedAmendment`; called from `legislative-clock.ts:930`, `living-world/local-council-meetings.ts:298`, `dc-council-sittings.ts` (D-5 step 3, done for computer-run members).
- `src/simulation/governing/chamber-procedure.ts:181 germanenessRule`, `:246 singleSubjectRule`, `:305 amendmentAdmissible`, `:386 recordChamberRuleChange`; data `data/research/legislative-procedure/{germaneness,single-subject,item-veto}.json`.
- `src/simulation/legislation.ts:2094 offerFloorAmendment`; the player's only amendment path today is bargaining-bound `presentation/legislative-bargaining-actions.ts:179 offerNegotiatedAmendment`.
- `src/simulation/campaign-opponents.ts:116 EMPHASIS_LEANS`, `:322 decideEmphasis`, `:153 opponent-message-released`, ad spend at `:974`; `campaigns.ts:1344 recordCampaignAdvertisingExpenditure`, `:1103 requestedCampaignAdvertisingGainBasisPoints`. Ads spend money but carry no message.
- `src/simulation/claim-stances.ts:141 recordPlayerClaim`; `records.ts:180 recordClaim`; `claim-contradictions.ts:96 scheduleContradictionCheck`, routes in `claim-contradiction-routes.ts`.
- `campaign-support.ts` `recordSupportShift`/`recordSupportLoss`: the only support path.
- Session 24 brief: `member-record.ts recordOf` (part 2) and rivals messaging on the record (part 3).

## What to change

1. **The player offers amendments directly.** An "offer an amendment" action on any measure at an amendable stage (council, legislature, Congress), writing through `offerFloorAmendment`, checked by `amendmentAdmissible` (germaneness, single subject, amendment access). Text comes from Session 9's bill paper (same clause menus). A refused part shows the rule in plain words. The body decides through the existing vote.
2. **Vote readings reader.** In `vote-bundle.ts` add `voteReadingsOf(world, voteId, personId)`: per part, its public face, who cares in a given place, and whether the member stood for or against it (`stancesFromVote`). Pure read; no new record.
3. **Honest, misleading or false.** New `src/simulation/vote-readings.ts`: classify a line "X voted against [part]" from the bundle alone: honest when the vote was on that part by itself (an amendment) or the part was the bill's main question; misleading when it was one of several parts and the member voted nay on the whole; false when the member voted for it, was absent, or the part was not in the bundle. No hand weights.
4. **The rival picks the worst reading their conscience allows.** After Session 24 part 3 picks the record item (Session 24 owns `campaign-opponents.ts`; land after it), choose among that item's readings through `evaluateDecision` from the rival's traits and principles (honesty, aggression, risk). A false reading is written as a claim with the Lie marker via `recordClaim` plus `scheduleContradictionCheck`, with the roll call as its contradiction route.
5. **Paid ads carry a message.** Extend the advertising expenditure input with target, positive/attack and the reading key. Reach goes to people by their recorded news and media habits. Each viewer decides how to take it (speech-reception pattern: relationship, traits, own view on that part, whether they know the real vote). Support moves only through `recordSupportShift`/`recordSupportLoss`, including backfire on the sponsor from viewers who know a reading is false or misleading. The player can buy the same ads; Session 22 owns the ad-making screen, this supplies the message data.
6. **Answers and fact-checks.** The target can answer (statement, ad, speech) citing the bundle. A reporter whose beat and personality lead them checks the claim through the contradiction route; the check reaches only that outlet's readers. Damage depends on who learns and their personality.
7. **Leave a trail for courts.** An adopted rider in a single-subject state records the rule it may break, for the later court engine to read. No court work here.

## Must NOT build

Hand-set "poison pill" or "must-pass" flags; popularity numbers per part; a fixed ad effect or ad multiplier; a second ad or opposition-research engine (investigations are a separate item); authored ad copy (all lines via `composeGroundedLine`); dice; place special cases.

## Done when (proof in a played game)

Random place: a computer-run member's sink amendment is adopted and the bill fails, with motive and count on the record; the player offers a rider to a rival's measure and an inadmissible one is refused with the reason. At the next election a rival's ad cites the player's nay on a bundle, printed with its reading class; a false reading is caught by a reporter who checks the roll call; viewers' support lines are written, including backfire. Same save, same result. Tests: `vote-readings.test.ts` (all three classes from a random state's roll calls), `amendment-admissibility.test.ts` (germane-required vs not-required chamber, same code), `attack-ad-backfire.test.ts`.

## Depends on

Session 24 (record reader, rival message), Session 22 (ads screen), Session 9 (bill paper text), Session 4 (scenes, Lie), Session 21 (vote moment), b08 (bargaining amendments), b15 (opposition research decides who finds a vote and whether they use it; b09 only decides how it is read), the local-reporter item.

## Open questions for the owner

None.
