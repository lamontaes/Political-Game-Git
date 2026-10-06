# INTERFACES: exported seams per owning session

Checked against main `d8dcd3ade` on 2026-10-06 (file:line is on that main). Columns: name | file:line | what it does | if not merged.
Open-PR names come from the PR diff, not main: they exist only after the PR merges. Read this before posting an interface question.

## 0. Shared rules

| Rule                | Where                          | What it means                                                                                                                                                                                                      |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `evaluateDecision`  | src/simulation/decisions.ts:66 | The one decision evaluator. It takes a `DecisionContext` whose `randomness` field is validated at line 81. Always pass `randomness: "none"` (examples: campaign-opponents.ts:367, life-callbacks.ts:708). No dice. |
| One writer per kind | briefs in docs/codex/          | Session 4 scene/English files; 13 elections; 21 votes and lived-outcome writers; 20 outcome landing; 6 life records. Call their function, never write the kind yourself.                                           |
| Overlap rule        | all sessions                   | Others may touch your file. Work anyway. The second merger rebases and keeps both changes.                                                                                                                         |
| Stub rule           | all sessions                   | If the owner's PR is open, write a one-function stub with the exact name below in your own file, mark it `// STUB until #N`, and swap it on merge.                                                                 |

## 1. Session 4: scenes and English

| Name                                            | File:line                                                                                                                                   | What it does                                                         | If not merged                                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectPlayedSceneExchange`                    | not on main; PR #2227 (head 118609ba0) adds to src/presentation/scene-conversation.ts                                                       | Projects the played exchange (speaker, line, replies) for a scene.   | Stub: returns `{ lines: [], replies: [] }`. Nearest main seams: `conversationExchangeTurns` scene-conversation.ts:51, `currentExchangeTurn` :140. |
| `playedSceneEnglishPacket`                      | not on main; #2227, scene-conversation.ts                                                                                                   | Builds the fact packet for one played line.                          | Stub: returns null.                                                                                                                               |
| `nextPlayedSceneSpeaker`                        | not on main; #2227 (also #2259), scene-conversation.ts                                                                                      | Says who talks next in the scene.                                    | Stub: returns the viewer.                                                                                                                         |
| `commitPlayedSceneTurn`                         | not on main; #2227, src/presentation/life-conversation.ts                                                                                   | Writes one played turn to the record.                                | Stub: call `commitLifeConversation` life-conversation.ts:700.                                                                                     |
| `composePlayedSceneLine`                        | not on main; #2227, src/presentation/small-talk-english.ts                                                                                  | Composes the English line for a played scene.                        | Stub: call `composeGroundedLine`.                                                                                                                 |
| `composeGroundedLine`                           | src/presentation/english-composition.ts:215                                                                                                 | Composes one line from speech act and recorded facts (parts at :59). | On main.                                                                                                                                          |
| `projectLifeConversation`                       | src/presentation/life-conversation.ts:178                                                                                                   | Current conversation view on main.                                   | On main.                                                                                                                                          |
| `officialViewLine`, `strongestLivedOutcomeView` | small-talk-english.ts:696, :511                                                                                                             | Lines about an official or a lived outcome.                          | On main.                                                                                                                                          |
| scene slots                                     | not on main; #2227 adds src/presentation/scene-slot-contract.ts (`SCENE_SLOT_KINDS`) and `currentStorySceneSituation` in story-scene-day.ts | Slot kinds stand/sit/lean/podium.                                    | Stub the four kinds as a const.                                                                                                                   |

Situation-row shape: there is no single exported "situation row" on main. Nearest: `LifeSituationBand` / `FormativeLifeSituationKey` / `AdultLifeSituationKey` in src/simulation/types.ts:5620-5653, plus src/simulation/situation-selection.ts and situation-profiles.ts. Not verified beyond that.

## 2. Session 13: election engine

| Name                                            | File:line                                                                                                                                                                                      | What it does                                                                         | If not merged                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------ |
| `scheduleElectionContest`                       | src/simulation/election-contests.ts:41                                                                                                                                                         | Puts one contest on the calendar.                                                    | On main.                                   |
| `resolveElectionContest`                        | election-contests.ts:340                                                                                                                                                                       | Counts and settles a contest.                                                        | On main.                                   |
| `countRecordedVoterBallots`                     | election-contests.ts:182                                                                                                                                                                       | Counts the recorded voter ballots.                                                   | On main.                                   |
| `contestIncumbentPersonId`                      | election-contests.ts:630                                                                                                                                                                       | Who held the seat going in.                                                          | On main.                                   |
| `electionContestById` / `electionContestResult` | :614 / :697                                                                                                                                                                                    | Read a contest and its result.                                                       | On main.                                   |
| `contests` (bare name)                          | does not exist                                                                                                                                                                                 | Nearest: `electionContestById` :614.                                                 |                                            |
| local election handlers                         | src/simulation/living-world/local-elections.ts:851 (`localElectionFilingHandler`), :1163 (`localElectionCountHandler`), :1377 (term start), :1752 (`localElectionHandlers`)                    | Town filing, count and term start. `localCampaignSeat` :297, `localSeatHolder` :430. | On main.                                   |
| `fileCampaign`                                  | src/simulation/campaigns.ts:594                                                                                                                                                                | Files a campaign.                                                                    | On main.                                   |
| clerk filing and election night                 | PR #2259 (head 4fadcaf5c, open): `fileThroughElectionClerk` (election-clerk-offices.ts), `electionClerkSceneOffer` (election-clerk-scene.ts), `councilElectionNight` (election-night-scene.ts) | Clerk desk filing and council result scene.                                          | Stub those three names; return null offer. |
| municipal candidacy ages                        | PR #2284 is MERGED (4601bb033)                                                                                                                                                                 | Estimates from same-state offices.                                                   | On main.                                   |

## 3. Session 21: votes and views

| Name                                       | File:line                                                                                                                                                              | What it does                                                                                                                                           | If not merged                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `memberVoteConsiderations`                 | src/simulation/legislative-member-decisions.ts:205                                                                                                                     | Lists what a member weighs on a vote. Input type: `DeriveMemberDispositionInput` :101 (nearest exported input type; confirm the function's own param). | On main.                                         |
| `decideChamberVote`                        | src/simulation/governing/chamber-votes.ts:840                                                                                                                          | Decides one chamber vote.                                                                                                                              | On main.                                         |
| attendance/presence                        | no exported function in chamber-votes.ts. "Answer present" option is data at legislative-member-decisions.ts:143. Nearest: `seatedChamberForPack` chamber-votes.ts:97. |                                                                                                                                                        | Stub none; read seated roster.                   |
| `officialViewReflectionHandler`            | src/simulation/living-world/official-views.ts:168                                                                                                                      | Turns official acts into what people think of them.                                                                                                    | On main; #2310 (1c0feed81) edits this file only. |
| `viewOfOfficial`                           | src/simulation/official-view-reads.ts:168                                                                                                                              | Reads a person's view of an official.                                                                                                                  | On main.                                         |
| `livedOutcomesOf` / `officialAnsweringFor` | src/simulation/living-world/lived-outcomes.ts:124 / :135                                                                                                               | A person's lived outcomes and who answers for each.                                                                                                    | On main.                                         |
| vote knowledge                             | PR #2310 (open)                                                                                                                                                        | Keeps actual vote knowledge in reflections.                                                                                                            | Read `viewOfOfficial` only.                      |

## 4. Session 23: executive desk

| Name                                       | File:line                                              | What it does                                                             | If not merged                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `openMatter`                               | src/simulation/press/matters.ts:267                    | Opens a press matter. NOT the governing matter opener.                   | On main. For governing use `openProgramMatters` state-governing.ts:1698, `openClemencyMatter` :1631, `openPresidentBillMatter` :341. |
| `decideGoverningMatter`                    | src/simulation/governing/state-governing.ts:2321       | Decides one governing matter.                                            | On main.                                                                                                                             |
| `GoverningMatterFamily`                    | state-governing.ts:164-171                             | chief-of-staff, agenda, implementation, budget, bill, program, clemency. | On main.                                                                                                                             |
| `governorDesk` / `executiveDesk`           | state-governing.ts:3285 / :3316                        | Executive desk handlers.                                                 | On main.                                                                                                                             |
| `governingMatters` / `governingMatterById` | :1049 / :1066                                          | Read matters.                                                            | On main.                                                                                                                             |
| `evaluateGovernorBill`                     | src/simulation/governing/governor-bill-decision.ts:386 | Governor's sign/veto evaluation.                                         | On main.                                                                                                                             |
| `synchronizeExecutiveInbox`                | src/simulation/executive-work.ts:761                   | Syncs the executive inbox.                                               | Exists on main. If the inbox part is not landed, stub callers to `receiveExecutiveWork` :61.                                         |

## 5. Sessions 6-7: life records and journal

| Name                            | File:line                                                                                                         | What it does                        | If not merged |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------- |
| `ensurePeopleTraits`            | src/simulation/people-traits.ts:372                                                                               | Gives every person traits.          | On main.      |
| `personTraits` / `personTrait`  | people-traits.ts:163 / :142                                                                                       | Read traits.                        | On main.      |
| `upbringingFor`                 | src/simulation/people-upbringing.ts:798                                                                           | A person's upbringing.              | On main.      |
| character history               | src/simulation/character-history.ts: `establishPreStartAdultHistory` :1280, `establishPreStartChildHistory` :1601 | Builds pre-start history.           | On main.      |
| `appendHistoricalEvent`         | src/simulation/history.ts:416                                                                                     | The one history writer.             | On main.      |
| `recordEventKnowledge`          | src/simulation/records.ts:154                                                                                     | Records who knows an event.         | On main.      |
| `recordRelationshipInteraction` | records.ts:233                                                                                                    | Records a relationship interaction. | On main.      |
| `projectLifeSoFarEnglish`       | src/presentation/life-so-far-english.ts:25                                                                        | Journal prose composer.             | On main.      |

## 6. Session 22: campaign scenes (Session 24 shares opponents)

| Name                                                       | File:line                                                                                                                         | What it does                                   | If not merged            |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------ |
| `fileCampaign`                                             | src/simulation/campaigns.ts:594                                                                                                   | Files a campaign.                              | On main.                 |
| staff                                                      | no exported campaign staff function in campaigns.ts. Nearest: `chiefOfStaffFor` state-governing.ts:501 (governing, not campaign). |                                                | Stub `campaignStaffFor`. |
| `offerCampaignLifeActivity` / `acceptCampaignLifeActivity` | src/simulation/campaign-life-activities.ts:687 / :934                                                                             | Offer and accept party-event style activities. | On main.                 |
| `projectCampaignLifeActivities`                            | campaign-life-activities.ts:2331                                                                                                  | View of activities.                            | On main.                 |
| `campaignOpponentFor`                                      | src/simulation/campaign-opponents.ts:295                                                                                          | The opponent in a race.                        | On main.                 |
| `projectKnownOpponentActivity`                             | campaign-opponents.ts:1558                                                                                                        | What the player knows of the opponent.         | On main.                 |
| `stateCampaignStand` / `liveQuestionsIn`                   | src/simulation/campaign-stands.ts:104 / :36                                                                                       | Candidate stands and live questions.           | On main.                 |

## 7. Session 25: misconduct and crises

| Name                      | File:line                                                                                                                                        | What it does                   | If not merged                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `recordViolenceAttempt`   | src/simulation/crisis/international.ts:858                                                                                                       | Records a violence attempt.    | On main.                                                                                                                |
| incidents                 | src/simulation/incidents.ts: `occurIncident` :180, `recordActorInitiatedIncident` :381, `incidentAt` :558                                        | Incident lifecycle.            | On main.                                                                                                                |
| press matters             | src/simulation/press/matters.ts: `openMatter` :267, `recordAllegation` :295                                                                      | Press matters and allegations. | On main.                                                                                                                |
| `MISCONDUCT_FAMILIES`     | src/simulation/press/records.ts:125                                                                                                              | `["M1","M2","M4","M7"]`.       | On main.                                                                                                                |
| `recordPartyBodyDecision` | src/simulation/living-world/party-evolution.ts:481                                                                                               | Records a party body decision. | On main.                                                                                                                |
| office continuity         | src/simulation/governing/office-continuity.ts (:139 version, :248 dedupe key); `recordOfficialContinuity` src/simulation/crisis/continuity.ts:35 | Succession and vacancies.      | Acting presidency: PR #2275 (6290aa50a, open) edits crisis/offices.ts, office-continuity.ts. Stub: no acting president. |

## 8. Session 20: outcomes and spending

| Name                              | File:line                                                                        | What it does                               | If not merged                                |
| --------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------- |
| `applyLawConsequences`            | src/simulation/enacted-law-effects.ts:796                                        | Applies a law's consequences.              | On main. Also `applyEnactedLawEffects` :242. |
| `createLawConsequenceRegistry`    | src/simulation/law-consequence-registry.ts:28                                    | Builds the consequence registry.           | On main.                                     |
| `budgetLawReading`                | src/simulation/public-budgets/fiscal.ts:131                                      | Reads budget terms from law (plural :258). | On main.                                     |
| `ensureOpeningGovernmentAccounts` | public-budgets/opening-government-accounts.ts:399                                | Opens starting accounts.                   | On main.                                     |
| outcome web                       | src/simulation/outcome-web/index.ts: `outcomeMeasure` :475, `outcomeFactor` :801 | Link table and factors.                    | On main.                                     |
| `recordedPayStubs`                | src/simulation/resource-income.ts:43                                             | A person's recorded pay stubs.             | On main.                                     |
| `assessPaycheckTaxes`             | src/simulation/statutory-tax.ts:92                                               | Withholding on a paycheck.                 | On main.                                     |

### LW-28 receiving contract (Session 20 → Session 41)

Put each handler at `src/simulation/law-consequences/modules/<module-key>/index.ts`
and export `registrations: readonly AnyLawConsequenceKindRegistration[]` (or
the narrower `LawConsequenceKindRegistration<T>[]`). The synchronous registry
reads the checked-in pure TypeScript manifest at
`src/simulation/law-consequence-module-manifest.ts`; Session 20 is its sole
writer and adds reviewed module exports there. Do not use host filesystem or
presentation/Vite discovery in simulation. Duplicate kind owners fail registry
creation. `LawConsequenceKind` remains a closed union: introducing a new kind
also needs a shared type-union edit. The current union admits
`public-library-service` and `parks-service-spending`. Session 41 owns those
modules and scoped effect adapters. Its candidate module is
`src/simulation/law-consequences/modules/civil-family-services/index.ts`,
exporting `registrations: readonly LawConsequenceKindRegistration<ResolvedLawConsequence>[]`;
it is not in the manifest until that source is available on this branch. The
sole-writer admission hunk is:

```ts
import { registrations as civilFamilyServiceRegistrations } from "./law-consequences/modules/civil-family-services";

export const LAW_CONSEQUENCE_MODULE_REGISTRATIONS: readonly AnyLawConsequenceKindRegistration[] =
  [...civilFamilyServiceRegistrations];
```

In `apply`,
call the canonical domain writer and pass the ID of the actual saved effect
record to `recordLawExposure` with the affected person, canonical `measureId`,
channel, direction, and supported amount. For a non-money effect use direction
`none` with null amount and cadence. This saves an idempotent named-person
exposure and schedules the normal official reflection. Aggregate reports and
catalog rows do not count as a landing. Session 19's `lawInForce` remains
unchanged.

For the LW-28 parks landing, the law-linked saved effect is a
`PublicProgramCapacityOutturnRecord` whose `commitmentId` resolves to the
`PublicProgramCommitmentRecord`, then its `appropriationId` resolves to the
`PublicProgramAppropriationRecord.sourceMeasureId`. Use the actual outturn ID
as the exposure source and the appropriation's source measure as attribution;
the current receipt/outturn date is the effect cutoff. Session 41 owns the
person residence and area-wide consumer. The public-program writer must invoke
the consequence receiver only after it has saved this actual outturn, passing
that outturn identity and law attribution; do not dispatch from a budget amount
or invent resident service hours. The typed receiver route is
`applyLawConsequences(world, context, registrations)` with
`context.activity: "service"`, `activityId: outturn.id`,
`onDate: outturnEvent.occurredAt`,
`governingLawId: appropriation.sourceMeasureId`, the parking law's
`questionKey`, and `subjectIds` restricted by Session 41's actual household
residence at that same event cutoff. The parks resolver must be outturn-specific:
Session 41's current candidate delegates to `resolveLawServiceConsequence`,
which looks up a completed scheduled activity by `activityId` and therefore
cannot consume a capacity-outturn ID. Resolution must carry `outturn.id` in
`sourceRecordIds` and the resolved person's own ID as `subject.id`; apply uses
those to write the named-person exposure against the canonical measure. Dispatch
for every law-linked saved outturn, including a saved zero-change outturn. Keep
the zero record and its cause identity; do not synthesize a positive change.
Whether a zero-change outturn should create a named-person no-change exposure
or only remain a caused public zero record is pending an exact CTO ruling. The
outturn links to `outturn.eventId` for its effect date. The writer call site is
`recordCapacityOutturn` in `src/simulation/governing/public-program.ts` and its
owning hunk must be coordinated with that file's current owner before editing.

The `abortion-access` landing is not registered here: it needs an actual
recorded pregnancy decision and person-level result from the family/births
producer, per CTO ruling #6013162583. Aggregate birth and infant-death outcome
links do not supply that evidence.

## 9. Session 19: law data

| Name                   | File:line                                                                                                                                                                                                  | What it does                                                                                                                                         | If not merged                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `lawInForce`           | src/simulation/governing/law-in-force.ts:115                                                                                                                                                               | The one public seam for law now in force.                                                                                                            | On main.                                                       |
| `startingLawTermScope` | law-in-force.ts:508                                                                                                                                                                                        | Starting law term for a scope. Readers: `startingLawTerms` :484, `startingLawCategories` :518, `startingLawSchedules` :526, `startingLawScope` :535. | On main.                                                       |
| per-area loader        | PR #2291 (88e328517, open) splits data/research/laws/starting-law-2026.json into starting-law-2026/<area>.json                                                                                             | Same readers, new data layout.                                                                                                                       | Keep calling the readers above; do not read the JSON directly. |
| final law terms        | src/simulation/governing/final-law-term-query.ts: `readFinalEnactedLawCategories` :160, `readOrEstimateFinalEnactedLawCategories` :234, `readFinalEnactedLawSchedule` :456, `readFinalEnactedLawTerm` :575 | Final enacted term reads.                                                                                                                            | On main.                                                       |

## 10. Session 34: state capitals

| Name              | File:line              | What it does                              | If not merged                                                                |
| ----------------- | ---------------------- | ----------------------------------------- | ---------------------------------------------------------------------------- |
| `capitalPlaceFor` | does not exist on main | No data/research/places directory either. | Stub `capitalPlaceFor(stateId)` returning null; swap when Session 34 merges. |

## Not verified

Param types of `memberVoteConsiderations`; the single situation-row type; any campaign staff seam; line numbers inside open PRs (names only).
