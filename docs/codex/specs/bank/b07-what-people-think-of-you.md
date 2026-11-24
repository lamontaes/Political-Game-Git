# What people think of you: word of mouth, the paper, real polls (bank id b07, phase P1 council journey)

## What the player experiences

On the town council there is no approval number. You find out what people think the way a real council member does: your sister tells you what her coworkers said about your vote, a man at the hardware store brings up the story in the paper, the local reporter writes that you switched sides. People who read the paper or hear from friends form their own opinion of you, and they pass on what they think to the people close to them. Higher up, polls start to exist because somebody pays for them: a newspaper polling a governor's race, a campaign with enough money buying its own. A poll asks real people in the game and reports what they said, with a real margin of error, so it can be off. Nobody, not even you, sees what everyone thinks.

## Owner decisions this rests on

- "Opinion: word of mouth and local paper at council; real polls higher up."
- News also spreads by word of mouth through relationships (Register line 53). Constitution item 13: polls can be wrong.
- "Local reporter knows you, calls for quotes, digs into your record" (separate bank item; this spec only reads published stories).
- Zero dice; nothing blank; no fixed percentages.

## Existing code it must use

- `src/simulation/official-view-reads.ts:168 viewOfOfficial`, `:192 strongestOfficialStanding`, `:277 townSupportFromViews`: each person's saved view of an official.
- `src/simulation/living-world/official-views.ts:168 officialViewReflectionHandler` (views formed from law exposures and lived outcomes), `:279 followsNewsClosely`, `:301 peopleKnownTo`, `:355 hearersOf` (confidants; conflict-averse people tell no one), `:780 reactionLens`.
- `src/simulation/law-exposure.ts:167 recordHeardExposure`: word of mouth for a law's effect; only first-hand experience is retold.
- `src/simulation/neighbor-news.ts:58 peopleTiedTo`, `:96 tellPeopleOf`: news traveling the tie graph through `recordEventKnowledge`.
- `src/simulation/press/desk.ts:1481 pressDeskSweepHandler`, `:1553 eventIsNewsCandidate`: what the paper covers. `src/simulation/press/story-exposure.ts` header: a story gives readers a law exposure with "no opinion weight": reading about an official changes nothing today.
- `src/simulation/press/outlets.ts:402 mediaOutlets`, `:564 ensurePressLocalCoverage`; `press/desk.ts:272 outletAssignmentCapacity` and the outlet work budget: what an outlet can afford.
- `src/simulation/campaign-polling.ts:46-48 drawBasisPoints` ("three independent draws", read by nothing: dead dice), `:60 surveyWorkDays`; `src/simulation/campaign-polling-estimate.ts` (memo from similar districts, "no poll of your own yet"); `campaigns.ts:1621` field memo.
- `src/simulation/election-contests.ts:177 countRecordedVoterBallots`: the one voter decision.
- `src/simulation/political-belief-formation.ts:99 evaluatePoliticalBeliefFormation`, `:312 applyNpcPoliticalBeliefFormation`; `politics.ts:99 recordPrivateBelief`.

## What to change

1. **Reading about an official forms a view.** When a person gains knowledge of a published story whose basis event names an official's act (a vote, a quote, a finding), form or adjust their view of that official through the same formation path the reflection handler uses: the act compared with the reader's own held view on that question, trust in the outlet, `reactionLens`. Readers are the people who actually learned of the story (knowledge records); no story reaches everyone.
2. **Opinions travel by word of mouth.** When a person's view of an official is formed from something they experienced or read, their `hearersOf` learn it (`recordEventKnowledge`, told-by the holder). A hearer may form a weaker view from a trusted person's cue through `evaluatePoliticalBeliefFormation`; a hearer does not retell hearsay (same rule as `recordHeardExposure`). Runs only when a view is formed, never on a schedule.
3. **What the player hears.** Supply Session 4's situation reader with the views of the player that people present know or hold, so they can bring it up in scenes. Add a "people you know" view (Session 14 places it) listing only what the player has been told or seen said, by whom and when; never a total.
4. **Polls are things someone pays for.** New `src/simulation/polls.ts`: `commissionPoll(world, {sponsorId, contestId | officialId, sampleSize, fieldedAt})`. Respondents are registered voters of the area, chosen in `world.personOrder` order seeded by the poll's stable key (selection only); each answers through the same decision as `countRecordedVoterBallots` (or view sign for approval); some decline to answer for their own recorded reasons. Result = shares plus the real margin of error for that sample size. Cost from a researched price range per completed interview (≤10 min, cited); paid from the sponsor's money.
5. **Who commissions polls.** Outlets decide through `evaluateDecision` from their recorded coverage area, audience size and reporting budget whether a race or official is worth a poll; campaigns can buy one when b02's treasury covers it. No office tier: council races get no polls because nobody can pay, not because of a rule. Polls publish through the press desk like any story.
6. **Replace dead dice and keep the fallback.** Delete `drawBasisPoints`. The field memo reports the latest poll the campaign paid for; with none, it keeps the existing similar-district estimate (the nothing-blank fallback).

## Must NOT build

- An approval rating, popularity meter or "town mood" number at council level.
- Any poll result not computed from real residents' decisions, or random poll noise.
- A view of everyone visible to the player.
- A second belief or knowledge writer; a scheduled gossip tick.
- Authored lines about the player's reputation.

## Done when (proof in a played game)

- Random town, player on council: after a contested vote, the paper runs the story; print three readers whose view of the player changed with their reasons, then two of their confidants who heard it; one brings it up in a scene. The "people you know" view shows only those told.
- Random state, governor's race: an outlet commissions a poll (print the decision reasons and cost), the poll's shares and margin are printed with respondent ids; the actual count later differs within reason. A council race in the same world gets no poll.
- Tests: `polls.test.ts` (same world → same poll; respondents answer like their ballots; margin matches sample size), `official-views.test.ts` (story readers form views, non-readers do not; hearsay not retold; conflict-averse tell no one).

## Depends on

Session 21 (owns `official-views.ts` reflection writers; coordinate), Session 24 (rivals and elections read these views), Session 4 (scenes), Session 14 (paper and the "people you know" view), b02 (campaign money), b06 (cases feed views), the local reporter bank item.

## Open questions for the owner

1. How does the player see what people think at council level?
   - (a) In scenes and the paper, plus a list of what each person you know has told you (recommended)
   - (b) Only in scenes and the paper, no list
