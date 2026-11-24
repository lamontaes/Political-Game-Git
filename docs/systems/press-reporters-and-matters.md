# PRESS46 — outlets, reporters, sources and record-backed financial matters

Status: CRUNCH46 §10 first implementation. Policy version `crunch46-provisional-v1`
(authored balancing, not empirical fitting).

## One store, no parallel truth

`history.pressRecords` is one optional, sequenced family (`src/simulation/press/records.ts`)
registered beside publications in `world.ts`. Every record indexes things that
already live elsewhere:

| truth              | where it lives                                                       |
| ------------------ | -------------------------------------------------------------------- |
| what happened      | `HistoricalEvent`                                                    |
| what someone said  | `ClaimRecord` (player answers via PEOPLE `recordPlayerClaim`)        |
| who knows          | `EventKnowledgeRecord`                                               |
| documents          | evidence artifacts and discoveries                                   |
| money              | resource flows and transfer outcomes                                 |
| what was published | `PublicationRecord`, via `publishPublicEvent` / `correctPublication` |

Publications gain an additive outlet identity: `outletKey` is `civic-ledger` or
`media:<outletId>`.

- A media publication is valid only when its source is a
  `press.story-published` event tagged with the same outlet and a story lead of
  that outlet.
- Civic Ledger stays the baseline public-record feed.
- Each source event still has exactly one first edition, and corrections stay
  linear.

## Outlets (M1)

`ensurePressOpening` runs once in `generateOpeningLife`. It is never run on load.

- **National.** It seeds three fictional national products (general newspaper,
  public-affairs broadcaster, politics publication), each with an organization
  and 2 reporters.
- **State.** `ensurePressStateCoverage` materializes one state newsroom:
  - at Begin for a player already in state office;
  - at the weekly sweep when the player takes part in a public event in an
    uncovered state (`ensurePressExposureCoverage`).
- **Local.** `ensurePressLocalCoverage` creates a small community outlet only
  where a represented local government exists. Otherwise the state newsroom's
  regional reporter covers the place.
- **Capacity.** small 1 / standard 3 / major 8 active assignments; extra leads
  queue or are declined.
- **Deep background** is accepted only by the major newspaper.

## Reporting lifecycle (M2)

`press:desk-sweep` runs every 7 days (authored) and considers only public
events recorded since the previous sweep.

1. **Routing.** Events are routed by geography and beat (national: no
   jurisdiction or national office; state newsroom: its state; community
   outlet: its place). Each outlet takes at most its free capacity.
2. **Leads.** Each taken event becomes a `story-lead`.
3. **Assignment.** A current reporter is chosen by beat, then familiarity with
   the same subjects, then workload. That reporter decides take/pass through
   `evaluateDecision`; "no story" is a real outcome.
4. **Response window.** A story naming a person asks that person to respond
   (`press.response-requested`, 2-day authored window). Non-player subjects
   decide to dispute, decline or stay silent. Silence is printed as "did not
   respond by publication time."
5. **Editorial decision** (AP/Reuters constraints as rules, not probabilities):
   - An allegation or records story without a public basis needs an on-record
     source, two distinct sources, or one source plus a leaked document.
   - Otherwise it is held once (7 days), then dropped, or narrowed to the public
     record.
   - Off-record contributions never enter copy.
6. **Copy.** Stories are assembled only from recorded words: basis summaries,
   quotes under negotiated attribution, recorded responses, and each
   institution's public step text, plus the byline.
7. **Readers.** A published story is read only by people with a recorded
   professional reason: the subjects, their colleagues and their party-chapter
   organizers.
8. **Follow-up and correction.**
   - Follow-up: public matter steps covered earlier by the same outlet become
     follow-up leads.
   - Correction: a story that stated an unattributed account as fact gets a
     correction appended after an official dismissal of a matter with no
     occurrence.

## Sources, interviews and leaks (M3)

- **Terms first.** `negotiateGroundRules` records the terms (on-record,
  background with exact label, deep-background, off-record) before any
  disclosure. The terms event is private to the two people.
- **Disclosure.** `discloseToReporter` writes the source's claim with an
  audience derived from the terms. Leaked records must be evidence the source
  actually discovered; the reporter records their own discovery.
- **Player answers.** `answerPressRequest` records the answer through PEOPLE's
  stance: truthful, deceive (a lie) or evade (decline). `pressAnswerOptions`
  shows the exact words and flags a lie before commitment. A lie is decided from
  the speaker's own knowledge, never from world truth.
- **Contradiction.** `pressMatterContradictionRoute` lets a later public finding
  or a reporter's ledger discovery contradict a denial.

## Financial matters (M4)

Occurrence, evidence, allegation and proceeding are separate linked records.

- **Deliberate misuse (M1).** `spendCampaignFundsPersonally` is the explicit,
  labeled option. It exists only for a candidate with a funded committee. It
  moves the money once through the resource writer, writes a private act, and
  records a restricted ledger entry.
- **Ledger review.** `press:ledger-review` fires 30 days later (authored). A
  campaign bookkeeper, if one exists, finds the entry and decides whether to
  raise it; with no bookkeeper the misuse stays unknown.
- **Rival complaints.** `produceRivalComplaints` lets a rival decide to allege
  personal use of a visible, legitimate vendor payment. That matter has no
  occurrence.
- **M2 and M7.** M2 needs a duty reference. M7 needs GOVERNING's labeled
  outside-mandate payment writer; the adapter currently fails closed.

Procedure adapters (`procedures.ts`):

| adapter           | steps                                                                                                                                 | rule deadlines                | authored intervals | public steps                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------ | -------------------------------------------- |
| FEC               | complaint → notice → response period → reason-to-believe / no reason to believe → conciliation → file released                        | 15-day response window        | the rest           | file release only                            |
| KY KLEC           | complaint → service → answer period → preliminary inquiry or dismissal → confidential reprimand or adjudicatory hearing → final order | 10-day service, 20-day answer | the rest           | probable-cause hearing order and final order |
| Simulated inquiry | opened → report                                                                                                                       | none                          | all                | report                                       |

- The simulated inquiry always carries its disclosure, and it cannot discipline
  anyone.
- A respondent who makes no choice has counsel respond (delegated).
- Institution actions pass through the GOVERNING `canInstitutionAct` stub, which
  answers "unknown" for all sanctions.
- There is no approval delta, poll, reach number or universal timeline.

## Responses (M5)

Party-chapter organizers and colleagues respond only after a knowledge record
shows they learned of the story. Responses are request-explanation / defend /
distance / maintain-support / no-action. A call for resignation is blocked
until a public finding exists. Relationship changes go through
`recordRelationshipInteraction`.

## Not yet (owed)

- M7 public-fund misuse: waiting on GOVERNING's writer.
- M2 duty packs.
- Sanction, resignation and vacancy consequences: waiting on GOVERNING's
  authority reader.
- Background NPC misconduct.
- Contacts beyond colleagues and party.
- National outlets reading CHANGE `economy.release-published` beyond the
  generic sweep.
- The player-side leak form.
