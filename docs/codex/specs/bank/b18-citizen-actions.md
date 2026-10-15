# Citizen actions: petitions, ballot measures, protests, groups, letters (bank id b18, phase P2)

## What the player experiences

You don't need an office to push your town around. You can start a petition (to recall a council member, put an ordinance on the ballot, or block one the council just passed) where your state and town allow it. Then you gather signatures from real neighbors, with friends and volunteers helping. A few doorsteps play as scenes and the rest happens in the background. If it qualifies, it goes on the ballot, voters decide from their own views, and a measure that passes becomes law. You can found or join a group of people who share a cause, march at city hall with the people who actually show up, write your representative in your own voice, or stand up at public comment. Officials who heard you, read your letter or saw the crowd weigh it by who you are to them, and they remember. Everyone else in town does the same things from their own lives. That is how a quiet town ends up with a neighborhood association, a recall fight or a ballot question.

## Owner decisions this rests on

- "Citizen actions: vote, speak at meetings, petitions and ballot measures, protests and groups, volunteer, write officials."
- "Signatures: a few played scenes, the rest background, where the place requires them."
- "Crowds: real people up front, a crowd sized by real turnout behind."
- "Meetings: only items that matter to you or the town play; rest summarized."
- Register (Oct 5 night, item 3): "Any place's pending amendment or ballot measure starts not in force; if voters pass it in a game, its text governs." Sept 28 spec: "Ballot measures and referendums where a state allows them."
- No fixed percentages deciding behavior. Behavior comes from each person.

## Existing code it must use

- Recall petitions, the model for every petition: `src/simulation/recall.ts:107` `municipalRecallRule`, `:164` `RecallPetition`, `:284` `canStartRecallPetition`, `:336` `startRecallPetition`, `:427` `recallResidentViews` (signers = eligible residents with a recorded view), `:538` `recallPetitionClosesHandler`, `:642` `recallElectionHandler`. UI: `presentation/recall.ts:50`, `player/MunicipalWorkspace.tsx:815-863`. Thresholds: `municipal-election-rules.ts:392` `resolveRequiredSignatures`.
- Local initiative and referendum rules exist as data and are never read: `municipal-election-rule-packs.ts:121-134` (initiative, referendum and their thresholds), compiled at about `:1008-1068`. Statewide amendments: `living-world/constitutional-reform.ts:906` `proposeAmendment`, `:1006` `recordedBallotTally`, `:1057` `constitutionalReformBallotHandler`; `constitutional-process.ts:375` `proposeConstitutionalMeasure` (its notes say citizen initiatives are not modeled).
- Groups: `living-world/law-interest-groups.ts:78` `joinLawInterestGroup` (forms only from money lost to a law; fixed founding count and loss line at `:60-76`); reads in `official-view-reads.ts:355-400`.
- NPC contact and attendance: `living-world/civic-actions.ts:165` `reviewTownCivicActions`, events at `:49` ("NOT MODELED: what the contact said"; the player is excluded).
- Public comment: `ordinary-meeting-presence.ts:57` `speakAtOrdinaryMeeting` (records who heard; no effect), placeholder lines at `:35`; authority at `municipal-public-work.ts:506`.
- Officials' constituent read: `governing/constituent-views.ts:39` `constituentsConsideration` (aggregate lean only). Office mail mode: `types.ts:5121` `OfficeCaseworkWorkflowMode` (no request records).
- Unrest: `pressure/ladder.ts:333` `stepPressureLadder`, statewide only. There is no protest action anywhere.
- Life choices held back for missing terms: `adult-situations.ts:2025` (`adult.petition-ask`), `:1812` (`adult.volunteer-ask`).
- Reach: `campaign-contact-calibration.ts:44` `modelCampaignFieldReach`. Eligibility: `issue-record.ts` `isEligibleVoterIn`.

## What to change

1. **One petition engine.**
   - Generalize `recall.ts` into petitions with a kind: recall (existing behavior kept), local initiative, protest referendum, state initiative or referendum, and constitutional initiative. Candidate filing petitions are b01's (`candidate-petitions.ts`); b18 does not touch them.
   - Rules come from the compiled municipal readings and a new state row per state (initiative availability, threshold, window, distribution, review; research ≤10 minutes per state; unread is estimated from similar states and marked).
   - Signatures use b01's writer: `askToSign` and the signed and declined events. b18 passes a petition subject (the official, or the measure's proposition) where b01 passes a candidate. Do not write a second signer decision.
   - Replace `recallResidentViews`' counting, which counts every resident with a view without anyone asking them, with signed events from circulators who really reached people (the player, volunteers, paid circulators, via `modelCampaignFieldReach`).
   - Clerk verification is b01's rule: a signature is invalid only when the record says so; there is no fixed rejection rate.
   - Release `adult.petition-ask`.
2. **Measures on the ballot.**
   - A qualified petition, or a council or legislature referral, becomes a ballot measure on the next lawful election. Generalize `recordedBallotTally` / `constitutionalReformBallotHandler` from amendments to ordinances and statutes.
   - Voters decide from their beliefs on the measure's proposition.
   - On passage, the measure's answer is enacted through the existing law-in-force path, with any legislative change-back rule as a state data row.
   - Test: a town measure passes and `lawInForce` reads it the next day.
3. **Groups for any shared cause.**
   - A founder is a resident with a strong recorded view or stake and a recorded goal. They decide to found through `evaluateDecision`; others join from their views, ties and time.
   - This replaces the fixed founding count and loss line in `law-interest-groups.ts`. Money lost to a law stays as one reason.
   - The group's leader decides its actions on the group's own decision days (members, the player included, can argue in a scene): petition, protest, letter drive, endorsement, testimony, or suing (b16 map challenges, b13 courts).
4. **Protests.**
   - A group or organizer sets a place and date (city hall, the capitol). Each invited or reached resident decides to attend from how much the issue matters to them, their work shift (`work-schedules.ts` `onShiftAt`) and their ties.
   - The attendees are recorded people. The crowd behind them is sized from that turnout.
   - The protest is a public event: the desk can cover it, and it reaches officials' considerations and the pressure ladder as a recorded cause.
   - The player attends or organizes as a Session 4 scene.
5. **Letters, calls and email.**
   - `civic-actions.ts` contact becomes a recorded message: sender, official, topic (a proposition or pending matter), stance and personal stake.
   - The player writes one in a short scene: pick the official, the topic and the stance; the English engine writes it in their voice.
   - Messages land in the official's office under its casework mode (Session 23 inbox). `constituentsConsideration` adds the real messages received.
   - Test: ten letters against a measure change a member's considerations by named senders.
6. **Public comment that counts.** Members who heard a comment (from `speakAtOrdinaryMeeting`'s hearing records) get a consideration on that item, weighed by the speaker's standing with them and their own traits. Session 21 owns vote considerations; this part supplies the source. Delete the placeholder lines at `:35` (Session 4 writes the words).

## Must NOT build

- Fixed shares ("23% contact officials") deciding who acts: Pew numbers only calibrate and test the outcome.
- Dice.
- Authored protest or petition events.
- A second ballot or election engine (Session 13 owns elections).
- A second scene engine.
- Campaign volunteering (Session 22 owns it).
- Statewide-only special cases.
- A daily tick over residents: decisions happen on group, petition and meeting dates.

## Done when (proof in a played game)

- In a random town where initiatives are allowed, the player starts an initiative, plays two doorstep scenes, and volunteers gather the rest. It qualifies on real counts, appears on the ballot, passes or fails from voters' views, and if it passes the law changes.
- In a town where initiatives are not allowed, the player is told why, in plain words.
- A 10-year background run shows a group founded by a named resident, a protest with named attendees covered by the paper, and letters that appear in a council member's vote reasons.
- Tests: `petitions.test.ts` (kinds, thresholds, eligible signers), the ballot measure enactment test, `groups` founder test, `protest` attendance test, and the letter consideration test.

## Depends on

- Session 4 (scenes).
- Session 13 (ballots and elections).
- Session 21 (vote considerations).
- Session 23 (office inbox).
- b01 (`askToSign` signature writer and clerk verification).
- b16 (map suits).

## Open questions for the owner

None. Group decisions follow the emergence rule: the group's leader decides from their own view, and a member (the player included) can argue in a scene.
