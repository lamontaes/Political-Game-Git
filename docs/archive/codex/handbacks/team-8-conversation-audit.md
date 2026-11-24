# Conversation audit records what each offered choice actually writes

Before: conversation records could be counted without showing which action wrote them. After: a development audit reads the shipped action declarations and commits every choice offered in a saved moment on its own isolated copy. It keeps the added, changed and removed records. The first three-place check reached two meeting-notice choices, not every conversation. Later phases and absent rooms remain unproven. No player behavior changes.

## 1. Why-chain

1. A choice counts as exercised only when the current production projection offers it and the normal writer accepts it.
2. The writer validates the actual room, addressee, volume, session and intent. Source keys alone do not establish availability.
3. The writer records speech, knowledge and any actual consequences. A commitment record does not establish that someone performed its activity.
4. The audit compares record IDs and complete contents, including changed rows with equal collection lengths and keyed world entities.
5. The terminal is the existing canonical writer and its saved input records. The audit invents no person, room, option, law or outcome.

No random choice decides which action fires. The audit deliberately exercises each offered option as a separate counterfactual from the same saved moment. Its branches are never added together as one life. Source-only declarations and dynamic record-derived keys stay separate from executed evidence.

## 2. Research

Runtime source is main `c240f91c3779034fe77d2eb3bed05671a7ed1e2b`. This is a software trace; no new demographic size, rate or legal-power claim is introduced. Existing speech and decision rules are read unchanged. No new spoken bank is authored.

The script inventories 102 declaration sites, including 95 distinct literal keys and 3 dynamic leads. A literal declaration does not prove a usable production room. A generated tell-topic key depends on a real experience or plan, not a fixed universal option. The contextual study-plan key is also dynamic. The existing subject registry contains 15 subjects. This source scan is a trace starting point, not a claim that every possible record-derived action was executed.

| Source key or dynamic declaration             | Declaration source                              | Lines         | Executed in these snapshots                |
| --------------------------------------------- | ----------------------------------------------- | ------------- | ------------------------------------------ |
| `greet`                                       | `src/presentation/life-conversation.ts`         | 76            | Not offered/executed in this proof         |
| `scene`                                       | `src/presentation/life-conversation.ts`         | 77            | Not offered/executed in this proof         |
| `activity`                                    | `src/presentation/life-conversation.ts`         | 78            | Not offered/executed in this proof         |
| `explain`                                     | `src/presentation/life-conversation.ts`         | 79            | Not offered/executed in this proof         |
| `suggestGame`                                 | `src/presentation/life-conversation.ts`         | 80            | Not offered/executed in this proof         |
| `suggestQuiet`                                | `src/presentation/life-conversation.ts`         | 81            | Not offered/executed in this proof         |
| `share`                                       | `src/presentation/life-conversation.ts`         | 82            | Not offered/executed in this proof         |
| `matter`                                      | `src/presentation/life-conversation.ts`         | 83            | Not offered/executed in this proof         |
| `officials`                                   | `src/presentation/life-conversation.ts`         | 84            | Not offered/executed in this proof         |
| `remember`                                    | `src/presentation/life-conversation.ts`         | 85            | Not offered/executed in this proof         |
| `acknowledge`                                 | `src/presentation/life-conversation.ts`         | 86            | Not offered/executed in this proof         |
| `leave`                                       | `src/presentation/life-conversation.ts`         | 87            | Not offered/executed in this proof         |
| `date`                                        | `src/presentation/life-conversation.ts`         | 88            | Not offered/executed in this proof         |
| `spendTime`                                   | `src/presentation/life-conversation.ts`         | 89            | Not offered/executed in this proof         |
| `acceptProposal`                              | `src/presentation/life-conversation.ts`         | 90            | Not offered/executed in this proof         |
| `declineProposal`                             | `src/presentation/life-conversation.ts`         | 91            | Not offered/executed in this proof         |
| `cancelProposal`                              | `src/presentation/life-conversation.ts`         | 92            | Not offered/executed in this proof         |
| `nothing`                                     | `src/presentation/life-conversation.ts`         | 93            | Not offered/executed in this proof         |
| `running:open`                                | `src/presentation/life-talk-running.ts`         | 50            | Not offered/executed in this proof         |
| `running:when`                                | `src/presentation/life-talk-running.ts`         | 51            | Not offered/executed in this proof         |
| `running:news`                                | `src/presentation/life-talk-running.ts`         | 52            | Not offered/executed in this proof         |
| `running:remember`                            | `src/presentation/life-talk-running.ts`         | 53            | Not offered/executed in this proof         |
| `running:help`                                | `src/presentation/life-talk-running.ts`         | 54            | Not offered/executed in this proof         |
| `running:worry`                               | `src/presentation/life-talk-running.ts`         | 55            | Not offered/executed in this proof         |
| `tell:<record-derived-topic>` (dynamic)       | `src/presentation/life-talk-topics.ts`          | 29            | Not offered/executed in this proof         |
| `request-commitment`                          | `src/presentation/run-b-conversation.ts`        | 105           | Not offered/executed in this proof         |
| `reassure`                                    | `src/presentation/run-b-conversation.ts`        | 106           | Not offered/executed in this proof         |
| `press`                                       | `src/presentation/run-b-conversation.ts`        | 107           | Not offered/executed in this proof         |
| `listen`                                      | `src/presentation/run-b-conversation.ts`        | 108           | Yes: separate meeting-notice branches only |
| `discuss-provision`                           | `src/presentation/run-b-conversation.ts`        | 109           | Not offered/executed in this proof         |
| `...LEGISLATIVE_BARGAINING_INTENTS` (dynamic) | `src/presentation/run-b-conversation.ts`        | 110           | Not offered/executed in this proof         |
| `raise-share`                                 | `src/presentation/run-b-conversation.ts`        | 111           | Not offered/executed in this proof         |
| `offer-to-do-more`                            | `src/presentation/run-b-conversation.ts`        | 112           | Not offered/executed in this proof         |
| `ask-to-split`                                | `src/presentation/run-b-conversation.ts`        | 113           | Not offered/executed in this proof         |
| `mention-meeting`                             | `src/presentation/run-b-conversation.ts`        | 114           | Yes: separate meeting-notice branches only |
| `say-you-will-go`                             | `src/presentation/run-b-conversation.ts`        | 115           | Not offered/executed in this proof         |
| `ask-them-to-go`                              | `src/presentation/run-b-conversation.ts`        | 116           | Not offered/executed in this proof         |
| `ask-what-they-want`                          | `src/presentation/legislative-bargaining.ts`    | 74            | Not offered/executed in this proof         |
| `request-support`                             | `src/presentation/legislative-bargaining.ts`    | 75            | Not offered/executed in this proof         |
| `offer-targeted-provision`                    | `src/presentation/legislative-bargaining.ts`    | 76            | Not offered/executed in this proof         |
| `counter-with-cap`                            | `src/presentation/legislative-bargaining.ts`    | 77            | Not offered/executed in this proof         |
| `refuse-request`                              | `src/presentation/legislative-bargaining.ts`    | 78            | Not offered/executed in this proof         |
| `ask-for-analysis`                            | `src/presentation/legislative-bargaining.ts`    | 79            | Not offered/executed in this proof         |
| `offer-private-inducement`                    | `src/presentation/legislative-bargaining.ts`    | 80            | Not offered/executed in this proof         |
| `remind-of-commitment`                        | `src/presentation/legislative-bargaining.ts`    | 81            | Not offered/executed in this proof         |
| `admit-it`                                    | `src/presentation/contextual-scene-families.ts` | 186           | Not offered/executed in this proof         |
| `keep-denying`                                | `src/presentation/contextual-scene-families.ts` | 212           | Not offered/executed in this proof         |
| `thank-for-correction`                        | `src/presentation/contextual-scene-families.ts` | 247           | Not offered/executed in this proof         |
| `say-yes`                                     | `src/presentation/contextual-scene-families.ts` | 279, 468, 645 | Not offered/executed in this proof         |
| `offer-another-day`                           | `src/presentation/contextual-scene-families.ts` | 303           | Not offered/executed in this proof         |
| `say-no`                                      | `src/presentation/contextual-scene-families.ts` | 320, 511      | Not offered/executed in this proof         |
| `ask-what-for`                                | `src/presentation/contextual-scene-families.ts` | 337           | Not offered/executed in this proof         |
| `nothing-to-say`                              | `src/presentation/contextual-scene-families.ts` | 375           | Not offered/executed in this proof         |
| `leave-it`                                    | `src/presentation/contextual-scene-families.ts` | 398, 1225     | Not offered/executed in this proof         |
| `offer-less`                                  | `src/presentation/contextual-scene-families.ts` | 487           | Not offered/executed in this proof         |
| `not-now`                                     | `src/presentation/contextual-scene-families.ts` | 499           | Not offered/executed in this proof         |
| `ask-what-happens`                            | `src/presentation/contextual-scene-families.ts` | 630           | Not offered/executed in this proof         |
| `not-sure`                                    | `src/presentation/contextual-scene-families.ts` | 664           | Not offered/executed in this proof         |
| `no-thanks`                                   | `src/presentation/contextual-scene-families.ts` | 675           | Not offered/executed in this proof         |
| `what-joining-means`                          | `src/presentation/contextual-scene-families.ts` | 696           | Not offered/executed in this proof         |
| `join`                                        | `src/presentation/contextual-scene-families.ts` | 711           | Not offered/executed in this proof         |
| `not-yet`                                     | `src/presentation/contextual-scene-families.ts` | 730           | Not offered/executed in this proof         |
| `keep-inviting`                               | `src/presentation/contextual-scene-families.ts` | 748           | Not offered/executed in this proof         |
| `not-for-me`                                  | `src/presentation/contextual-scene-families.ts` | 766           | Not offered/executed in this proof         |
| `ask-when`                                    | `src/presentation/contextual-scene-families.ts` | 784           | Not offered/executed in this proof         |
| `say-why`                                     | `src/presentation/contextual-scene-families.ts` | 947           | Not offered/executed in this proof         |
| `ask-for-help`                                | `src/presentation/contextual-scene-families.ts` | 959           | Not offered/executed in this proof         |
| `admit-doubt`                                 | `src/presentation/contextual-scene-families.ts` | 977           | Not offered/executed in this proof         |
| `ready`                                       | `src/presentation/contextual-scene-families.ts` | 992           | Not offered/executed in this proof         |
| `nervous`                                     | `src/presentation/contextual-scene-families.ts` | 1003          | Not offered/executed in this proof         |
| `thank-for-campaign`                          | `src/presentation/contextual-scene-families.ts` | 1021          | Not offered/executed in this proof         |
| `it-stings`                                   | `src/presentation/contextual-scene-families.ts` | 1036          | Not offered/executed in this proof         |
| `whats-next`                                  | `src/presentation/contextual-scene-families.ts` | 1054          | Not offered/executed in this proof         |
| `talk-later`                                  | `src/presentation/contextual-scene-families.ts` | 1065          | Not offered/executed in this proof         |
| `give-date`                                   | `src/presentation/contextual-scene-families.ts` | 1080          | Not offered/executed in this proof         |
| `no-date-yet`                                 | `src/presentation/contextual-scene-families.ts` | 1102          | Not offered/executed in this proof         |
| `thank-them`                                  | `src/presentation/contextual-scene-families.ts` | 1115          | Not offered/executed in this proof         |
| `ask-summary`                                 | `src/presentation/contextual-scene-families.ts` | 1182          | Not offered/executed in this proof         |
| `staff-tracks`                                | `src/presentation/contextual-scene-families.ts` | 1191          | Not offered/executed in this proof         |
| `read-it-yourself`                            | `src/presentation/contextual-scene-families.ts` | 1208          | Not offered/executed in this proof         |
| `no-comment-again`                            | `src/presentation/contextual-scene-families.ts` | 1384          | Not offered/executed in this proof         |
| `about-community`                             | `src/presentation/contextual-scene-families.ts` | 1401          | Not offered/executed in this proof         |
| `too-early`                                   | `src/presentation/contextual-scene-families.ts` | 1412          | Not offered/executed in this proof         |
| `save-for-interview`                          | `src/presentation/contextual-scene-families.ts` | 1423          | Not offered/executed in this proof         |
| `confirm`                                     | `src/presentation/contextual-scene-families.ts` | 1445          | Not offered/executed in this proof         |
| `no-comment`                                  | `src/presentation/contextual-scene-families.ts` | 1458          | Not offered/executed in this proof         |
| `deny`                                        | `src/presentation/contextual-scene-families.ts` | 1470          | Not offered/executed in this proof         |
| `offer`                                       | `src/presentation/contextual-scene-families.ts` | 1563          | Not offered/executed in this proof         |
| `ask`                                         | `src/presentation/contextual-scene-families.ts` | 1595          | Not offered/executed in this proof         |
| `keep-looking`                                | `src/presentation/contextual-scene-families.ts` | 1606          | Not offered/executed in this proof         |
| `id` (dynamic)                                | `src/presentation/contextual-scene-families.ts` | 1697          | Not offered/executed in this proof         |
| `compare`                                     | `src/presentation/contextual-scene-families.ts` | 1787          | Not offered/executed in this proof         |
| `compromise`                                  | `src/presentation/contextual-scene-families.ts` | 1800          | Not offered/executed in this proof         |
| `hold`                                        | `src/presentation/contextual-scene-families.ts` | 1811          | Not offered/executed in this proof         |
| `vote-for`                                    | `src/presentation/contextual-scene-families.ts` | 1916          | Not offered/executed in this proof         |
| `vote-against`                                | `src/presentation/contextual-scene-families.ts` | 1928          | Not offered/executed in this proof         |
| `not-decided`                                 | `src/presentation/contextual-scene-families.ts` | 1940          | Not offered/executed in this proof         |
| `ask-what-it-does`                            | `src/presentation/contextual-scene-families.ts` | 1951          | Not offered/executed in this proof         |

A repeated key such as listen is scoped by its subject and saved progress. Executing it in the meeting-notice subject does not certify its other subjects. Spread declarations identify an existing imported vocabulary; they are not new action keys.

## 3. Revisions

The three supplied worlds initially had no offered conversations before Begin. That is preserved in the first ignored receipt. The second run explicitly called the existing openOrdinaryLife writer on a copy, then audited the actual opened moments. It did not put people into a room manually.

The first test attempt had a syntax typo and failed before product assertions. It was corrected. A sandbox child-process refusal was also retained before the completed guarded test run. Neither attempt is counted as a pass. Strict checking initially caught two script typing errors; both were repaired without suppressions.

The detector now compares keyed entities as well as append-oriented history. The unchanged source input is checked after all branches. No replay branch reuses another branch's effects.

## 4. What gets built, in numbered parts

1. A reusable source-declaration inventory with exact file/line references and dynamic-key flags.
2. A saved-world audit of every currently offered subject, addressee, allowed volume and intent. Each accepted branch records before/after canonical rows and time; refusals record their actual reason.
3. A CLI taking repeated --world files, an explicitly pinned --head, --out, and optional --begin yes. The optional Begin preparation is labeled in the output. Inputs are not rewritten.
4. One changed test file checks modified records at equal counts, duplicate identity refusal, dynamic-source separation and real canonical conversation writes without mutation or invented rooms.

Next coverage must use later saved phases and real workplaces, meetings and households. No unavailable office or legislature scene is fabricated to increase the count. The declared option universe remains separate from watched availability.

## 5. Simulated, records, world pieces, checks

SIMULATED: existing people and conversation writers decide and speak unchanged. The development audit adds no actor rule.

RECORDS: actual event, claim, knowledge, relationship and perception rows from each independent branch. The output retains record IDs and contents rather than treating prose or a nonempty list as proof.

WORLD PIECES: production room and presence projections, saved subject progress, current hearing rules and canonical commits already exist. Three registered office/legislative subjects lack a production room wiring in player-conversation; their development fixtures do not prove normal-player entry. Missing rooms in this proof are explicitly reported for every registry subject.

CHECKS: 12 offered attempts wrote records; 0 refused and 0 produced no record change. This is only TWO distinct action keys at two allowed volumes in three worlds. No law-effect noticed/fired denominator has been established; Team2's all-effects audit is still required.

## 6. Proof run

The unchanged main runtime read three previously saved random-place worlds, including unincorporated Quantico and Tab. Each supplied game was opened through the canonical Begin writer on a fork.

| Saved seed          | Place/source GEOID | Offered branch attempts | Records written | Refused | Distinct intent keys    |
| ------------------- | ------------------ | ----------------------- | --------------- | ------- | ----------------------- |
| `team8-opening-1-a` | `2464475`          | 4                       | 4               | 0       | listen, mention-meeting |
| `team8-opening-1-b` | `1669130`          | 4                       | 4               | 0       | listen, mention-meeting |
| `team8-opening-1-c` | `1874780`          | 4                       | 4               | 0       | listen, mention-meeting |

Measured writes per independent branch:

| Subject/action                                | Added records                                                                            | Meaning and limits                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| neighborhood-meeting-notice / mention-meeting | One event, three knowledge rows, one claim, one relationship interaction, one perception | Mentioned an existing posted notice; no meeting attendance or vote inferred. |
| neighborhood-meeting-notice / listen          | One event and two knowledge rows                                                         | Listened without a new claim; no commitment or downstream activity inferred. |

Changed test 4/4 PASS, completed exit 0, 25.89 seconds. Strict changed audit/CLI/test and dependencies: 0 diagnostics. Scoped ESLint PASS. Source/script output and test evidence are ignored under test-results/team8. Final formatting, report and declaration checks are recorded in the PR.

The source declarations are not all proven. Browser, full suite, year-speed, later conversation phases, all-subject production routes and the law-noticing watched-year count: NOT RUN. No independent helper was created because the session forbids new teams/helpers.

## 7. Worked example

In the Quantico save, Jorge Wu and Arthur Wu were the canonical meeting-notice participants. Mentioning the posted notice produced event_d7e8bab79c49d246 and its actual claim/knowledge/relationship/perception rows. Listening on another fork produced the same stable event ID for that same turn identity, with a different recorded action and no new claim. Those are mutually exclusive audit branches, not two turns accumulated in one saved life. Reusing the ID across isolated alternatives is not counted twice in one world.

No paycheck, rent, tax or invented monthly amount enters this conversation example. Whether a passed law reached and was noticed by a person remains a separate measured audit question.

Next: publish the tool as a bounded partial-coverage draft, extend it with real later-phase snapshots, and join its actual conversation record references to Team2's fired-effect rows when posted. Team5 released the two press reader files; other shared writers remain with their owners. The source finding that non-money exposures skip official-view reflection is not a researched zero or a watched count.
