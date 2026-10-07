# Poison pills, riders and attack ads that read your vote at its worst (bank id b09, phase P4 build; unlocks the legislative amendment fight and the election-on-your-record ads)

Verified against origin/main ec9a9601a (Oct 5). Bank spec: docs/codex/specs/bank/b09-poison-pills-riders-attack-ads.md.

## What the player experiences

Bills change on the way through. A colleague who hates your bill adds a part that sounds fine but splits your supporters, and the bill dies. Another bolts a pet item onto a must-pass budget. You can do the same inside your body's real rules (amendments must fit the bill; many states allow one subject per law), and a part that does not fit is refused with the rule in plain words. Every vote you cast is kept exactly as the bill read that day, part by part. At election time a rival takes your no on a big bill with one popular part and says "voted against school lunches." Some readings are honest, some misleading, some false. False ones are lies on the record that anyone holding the roll call can catch. You answer, explain or hit back, and a fact-check reaches only the people who read that outlet. Ads can backfire on whoever runs them.

## Owner decisions it rests on

- D-5 (approved Sept 28): "Every recorded vote keeps exactly which provisions were on the table." "Computer-run lawmakers amend to pass, sink, force a recorded vote or ride a must-pass bill, within each chamber's real rules." "Opposition research reads votes as honest, misleading or false, and false readings carry the Lie marker. Targets answer, and fact-checks reach their own readers."
- "Ads: positive or attack, target, message, pay for placement; can backfire."
- "Lies: recorded; found out by anyone with contradicting facts; damage by who and their personality."
- Sept 28 overrule: chamber procedure starts as each chamber's real rules and can be changed in game.
- Fixed rules: zero dice; nothing blank or placeholder; one rule for all 50 states, D.C. and territories; emergent not authored; real data calibrates the start only; one writer per record kind; delete what you replace.

## Existing code to extend (verified on ec9a9601a)

- `src/simulation/vote-bundle.ts:197 voteBundle`, `:239 stancesFromVote`: the exact parts a vote decided. Done, no caller outside tests. New reader goes here.
- `src/simulation/provision-public-face.ts:33 publicFaceOfPart`, `:89 whoCaresAbout`: public label and who cares. Done; reuse.
- `src/simulation/governing/amendment-authors.ts:378 planFloorAmendment` (motives pass/sink/record/ride). `offerPlannedAmendment` is imported by `governing/legislative-clock.ts:72`, `living-world/local-council-meetings.ts:4,298` and `dc-council-sittings.ts:15,203`. Computer-run side is done; do not touch except to route the new player path through the same offer function.
- `src/simulation/governing/chamber-procedure.ts:181 germanenessRule`, `:199 amendmentAccessRule`, `:246 singleSubjectRule`, `:305 amendmentAdmissible`, `:386 recordChamberRuleChange`. Data: `data/research/legislative-procedure/{germaneness,single-subject,item-veto}.json` (germaneness rows carry citation and quote per chamber).
- `src/simulation/legislation.ts:2094 offerFloorAmendment`. The player's only amendment path today is bargaining-bound: `src/presentation/legislative-bargaining-actions.ts:179 offerNegotiatedAmendment`. This is the seam: add a direct player path next to it, both calling `offerFloorAmendment`.
- Ads: `src/simulation/campaigns.ts:1344 recordCampaignAdvertisingExpenditure` and `:1103 requestedCampaignAdvertisingGainBasisPoints`: ads spend money and carry no message. Rival ad spend call: `campaign-opponents.ts:974`.
- Rival message: `campaign-opponents.ts:116 EMPHASIS_LEANS` (spec and Session 24 brief say :110/:116; it is :116 on main), `:322 decideEmphasis`, `:153 "campaign.opponent-message-released"`.
- Lies: `claim-stances.ts:141 recordPlayerClaim`, `records.ts:180 recordClaim`, `claim-contradictions.ts:96 scheduleContradictionCheck` (live callers: `press/sources.ts:339,495`, `presentation/contextual-scenes.ts:630`).
- Support moves only through `campaign-support.ts:178 recordSupportShift` and `:244 recordSupportLoss`.
- Reading pattern for viewers: `speech-reception.ts:259 speechReception`.
- Not on main yet: `member-record.ts` / `recordOf` (Session 24 part 2) and rivals messaging on the record (Session 24 part 3). Nothing for vote readings exists (`voteReadingsOf`, `vote-readings.ts` absent).

## Build steps (one PR each, in this order)

1. **The player offers an amendment directly.** Files: `presentation/legislative-bargaining-actions.ts` (or a new sibling file next to it), `legislation-session.ts` caller. "Offer an amendment" on any measure at an amendable stage (council, legislature, Congress) writes through `offerFloorAmendment`, gated by `amendmentAdmissible`. Text from Session 9's bill paper clause menus. A refused part prints the rule text from the data row. The body decides through the existing vote. Must NOT: add a second amendment writer or a council-only branch.
2. **Vote readings reader.** `vote-bundle.ts` gets `voteReadingsOf(world, voteId, personId)`: per part, public face, who cares in a given place, and whether the member stood for or against (`stancesFromVote`). Pure read, no new record.
3. **Honest, misleading or false.** New `src/simulation/vote-readings.ts`: classify "X voted against [part]" from the bundle alone. Honest: the vote was on that part alone, or it was the bill's main question. Misleading: one of several parts and a nay on the whole. False: member voted for it, was absent, or the part was not in the bundle. No weights.
4. **The rival picks the worst reading their conscience allows.** Land after Session 24 part 3. Choose among the record item's readings through `evaluateDecision` (`decisions.ts:66`) from the rival's honesty, aggression, risk. A false reading is written with `recordClaim` carrying the Lie marker plus `scheduleContradictionCheck`, route = the roll call. Must NOT: edit `campaign-opponents.ts` before Session 24 merges (it owns the file).
5. **Paid ads carry a message.** Extend the expenditure input with target, positive or attack, reading key. Reach goes to people by recorded news and media habits. Each viewer decides by speech-reception pattern (relationship, traits, own view of the part, whether they know the real vote). Support changes only through `recordSupportShift`/`recordSupportLoss`, including backfire on the sponsor from viewers who know it is false or misleading. Session 22 owns the ad-making screen; you supply message data only. `Replaces:` the messageless ad path: `requestedCampaignAdvertisingGainBasisPoints` must read the viewer decisions, not a fixed gain.
6. **Answers and fact-checks.** The target answers (statement, ad, speech) citing the bundle. A reporter whose beat and personality lead them checks through the contradiction route; the check reaches only that outlet's readers.
7. **Trail for courts.** An adopted rider in a single-subject state records the rule it may break (a record, nothing more). No court work.

## Must NOT build

Hand-set "poison pill" or "must-pass" flags; popularity numbers per part; a fixed ad effect or multiplier; a second ad or opposition-research engine (investigations are another item, b15); authored ad copy (every line through `presentation/english-composition.ts composeGroundedLine`); dice; place special cases.

## Research tables

No new number needed. Procedure rows already exist in `data/research/legislative-procedure/` for germaneness, single subject and item veto. Which chambers allow a motion to drop or reshape a part is not there and belongs to b12's rule table; do not duplicate it here.

## Done when (played-game proof)

- Random place (`tests/support/random-place.ts`): a computer-run member's sink amendment is adopted and the bill fails, motive and count on the record. The player offers a rider on a rival's measure; an inadmissible one is refused with the reason.
- Next election: a rival ad cites the player's nay on a bundle, printed with its reading class. A false reading is caught by a reporter who checks the roll call. Viewers' support lines are written, including backfire. Same save, same result.
- Same flow in a statehouse place and a random territory/D.C. place.
- Tests: `vote-readings.test.ts` (all three classes from a random state's roll calls), `amendment-admissibility.test.ts` (germane-required vs not-required chamber, same code), `attack-ad-backfire.test.ts`.

## Proof to post

PR comment per step: random place and seed, the printed reading classes with vote ids, the refusal text, viewer support lines with record ids, the delete list for each "Replaces:", and `npm run typecheck` plus the changed test files passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

- No open owner questions. Switch kept anyway: which readings a rival may consider = one data row of the three classes with the honesty bar each needs, read by `evaluateDecision`; a reading class can be turned off by editing that row.
