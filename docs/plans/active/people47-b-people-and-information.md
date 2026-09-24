# CRUNCH47 B — People and Information

Owner: the PEOPLE/PROSE session, which now also owns the press domain.
Branch `claude/prose-contextual-scenes`, base main `fed321f7`. The head at
entry is `08b23ea3` = PEOPLE `89d513d9` + frozen PRESS `a070dde7`.

B1 completes the living-person experience (relationships, memory, childhood,
family, grief, continuation). B2 finishes reporting, leaks and misconduct.

## Agreed interfaces

These were agreed directly with the other owners at entry. They are recorded
here so a reader can see what this branch is built against.

### From C (World), branch `claude/world47-integration`

- Opening gate, re-exported from `../simulation`:
  `worldOpeningVersionOf(world)` returns the version or `null` for a legacy
  save, and `CRUNCH46_WORLD_OPENING_VERSION` is
  `"world-opening-crunch46-v1"`. New press opening setup runs only for that
  version; a legacy replay descriptor keeps its own construction.
- Death notices come from CRISIS through C. B asked for a per-recipient
  effect key, the death's sequence, the deceased and the recipient, the
  relation, whether the cause may be told to that recipient, and whether they
  already knew. B writes the family knowledge and the grief choices; it writes
  no capacity or productivity effect.

### From D (Governing), branch `claude/governing-all-states` @ `6748b6af`

- `recordOutsideMandatePublicPayment(world, input)` moves the money, once per
  `fundingId` plus `operationKey`.
- `canInstitutionAct(world, input)` answers `available`, `unavailable` or
  `unknown`. It names a possible procedure. It is never a finding.
- `recordOfficeConsequence(world, input)` is D's writer for what an office
  does about a matter. B supplies the scene, the words and the evidence ids;
  D decides whether the office changes.

B never ends a term, never moves money on its own and never writes a finding.

### To A (Experience)

- `pendingCommandsInvalidatedBy(world)` returns `null` or a monotonic marker
  `{sequence, occurredOn, predecessorPersonId, successorPersonId, kind}` so a
  queued command from a previous life cannot apply after a handoff.
- `projectContacts(world, personId)`: one projection per played person, with
  each contact's relationship, channels and per-channel reason when a channel
  is not usable now.
- A counterproposal is an explicit option carrying its own terms.
- Recall cards carry the event id and its date for A's drilldown.
- Grief is choices-only: no numbers and nothing compulsory.
- Childhood actions render in the Personal workspace's existing day section.

## What is done

**B1 is complete.** Branch `claude/prose-contextual-scenes`.

| Row          | Where it lives                                                                                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3           | `people-contact.ts` (asking, answering, a different day offered back, somebody reaching out on their own, a day that lapses), `people-contacts.ts` (the projection A mounts), the favor family's "meet-up" scene |
| P4           | `people-recall.ts` (asked, agreed, declined, performed kept apart), `people-request-route.ts` (the asker's own memory as evidence), the favor family's "recalled" scene, `people-recall-cards.ts`                |
| P14          | `childhood.ts` — the formative bank's own agency field, finally read                                                                                                                                             |
| Family       | `people-family-plan.ts` — two adults decide, and the day arrives on the clock                                                                                                                                    |
| Grief        | `people-bereavement.ts` and the home-evening "bereaved" scene                                                                                                                                                    |
| Continuation | a wider successor list, with the people the life was bound to first; `pendingCommandsInvalidatedBy` for A                                                                                                        |

Proof: 17 test files, 283 tests, on `caa2ac60`.

**B2 is partly done.** The seam branch `claude/people47-seam` composes B1 with
WORLD and GOVERNING:

- PRESS's two GOVERNING placeholders are gone; the real writers are in place,
  and public-fund misuse is reachable.
- New press opening setup runs only for a current opening version, so a legacy
  save is rebuilt exactly as it always was (`pressOpeningApplies`).
- `press-disclosure.ts` is the player's side: who could be talked to, what each
  arrangement means, and only what this character actually knows or holds.
- Matter reactions now reach the people who live with it, not only colleagues
  and party contacts.
- A correction is appended and the original stands, proven on its own record.
- A defect A found in the composition is fixed: a story with two subjects could
  not be answered by the second one, which threw inside the clock.

Still open in B2: NPC-originated misconduct (only the player's own deliberate
act creates an occurrence today), the undisclosed-conflict family, which has
no producer, and the staff-mediated explanation flow, which waits on D's
`recordOfficeConsequence`.

## B1 scope

| Row | Work                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3  | contact route: request → accept / refuse / counterproposal → calendar commitment → meeting → remembered agreement; NPC-originated invitations from their own aims; pair-specific eligibility |
| P4  | genuine uncertainty and evasion answers; recall cards with the real event and date; reappearance on a real trigger                                                                           |
| P14 | passive childhood, then age-appropriate agency                                                                                                                                               |
| —   | family producers: intention → accepted event → dated resolution                                                                                                                              |
| —   | grief and acknowledgment from the death notice                                                                                                                                               |
| —   | continuation widened past relatives, with prominence for real relations                                                                                                                      |

## B2 scope

| Row | Work                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- |
| —   | replace the two GOVERNING placeholders with the real writers                                                                            |
| —   | gate new press opening setup on the opening version                                                                                     |
| —   | ordinary reporting chain: event or tip → assignment → contact → response → publish, hold, narrow or drop → later evidence or correction |
| —   | player leaks and NPC reporting choices, with access checked for the actor                                                               |
| —   | keep occurrence, evidence, allegation and proceeding separate                                                                           |
| —   | staff-mediated explanation, defense, cooperation and resignation, wired to D's writer                                                   |

## Received from PRESS with the source

Owed, not defects: the undisclosed-conflict family has no producer; one
matter kind stays hidden until D's writer is in; only the player's deliberate
act creates misconduct today; reactions reach colleagues and chapter
organizers only; there is no player leak form in the interface; the press
panel has no test and no pointer or keyboard review; full validation and the
browser suite never ran on that branch.

## F47.1 education, family by family

Education here is a setting where people meet, not a second school simulator.
Each authored family is ported one at a time, and only when the records it
names already exist. What is landed:

| Cargo family           | State                                                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `edu-working-together` | Landed as the `study-peer` family: a real classmate on a real enrollment, the answer decided before the wording, agreement or refusal, and no academic cost for turning it down.    |
| `edu-disagreement`     | Landed as the `study-plan` family, in two variants: each of them says how they would work, and if they want different things, whether either moves.                                 |
| `edu-time-choice`      | **Not bindable.** See below.                                                                                                                                                        |
| `life-promise`         | Landed as the renegotiation route on the recalled-request scene: an arrangement can be changed by agreement, and asking is not dropping.                                            |
| `edu-reconnect`        | **Not bindable.** Needs a canonical open position under a real authority. GOVERNING has it noted as a consumer of their committee-and-staff work; nothing is faked in the meantime. |

### Why `edu-time-choice` is not bound

The cargo requires a conflict between a study commitment and an employment or
household commitment, an authorized counterpart, and concrete schedule
alternatives. Two halves of that do not exist:

- Every study path in the catalog advances by period, not by session, so no
  study hour is ever placed on the calendar. A calendar conflict involving
  study is therefore not representable. A weekly time-demand range exists and
  is disclosed, but it has no time of day.
- No writer lets anybody authorize a change to an employment's terms, so the
  family's `accepted` outcome has nothing to write. The only changeable thing
  in the substrate is one scheduled activity with a movable window, and moving
  a single hour does not resolve a weekly-hours overlap.

Inventing either half would mean inventing free time or an admissions
mechanic, which F47.1 forbids. The family waits for study time on the calendar
or a supported change-of-terms writer, whichever arrives.

### What `study-plan` proves

An approach is an id in an authored registry, never a sentence composed for
the moment; the revision a player may offer is written in advance and shown in
the choice itself; and for two approaches with no authored half-way version,
no revision is offered at all. The other person's approach is decided from
their own temperament against the collaboration they already agreed to, so it
is not a reaction to what the player picked. Wanting the same thing settles
without staging an argument. Holding your own position writes no relationship
record, and a question left open rests and then comes back against the record
of it being left open — a later follow-up rather than the same scene repeating.

## Q47-003b — observable expression: not produced today

E asked for an explicit per-person observable expression cue on the
conversation/scene projection. There is none, and E is right not to infer one.

What the projections actually carry. `PlayerConversationView` has no such
field. `ConversationExchangeTurn` carries `eventId`, `sequence`, `date`,
`current`, `playerLine`, `speakerPersonId`, `speakerName`, `reply` (the
other person's words as prose) and `heardByPersonIds` — nothing about a face.
`SceneAnswer` carries `perception` and `landed`, which are about what the
speaker now makes of the player and how an answer landed in the family's own
words; neither is an observable expression and neither is per-onlooker.

`expressionKey` exists in the codebase but is not this. It belongs to the
personality catalog — how a tendency expresses itself in conduct — and it is
attached to a trait, not to a turn. Reading a face off it would not be a
shortcut; it would be a category error, and the saved record would not support
it.

Recorded as **Q47-003b pending**: a missing producer, not a missing field.
Not built tonight; this is not authorization to build it.

When it is built, four constraints come from this lane and should be stated
with the work rather than discovered during it:

1. Decided before it is worded, like every other semantic an NPC has. The
   expression is what they are observably doing, chosen once; the prose that
   describes it follows.
2. Neutral is the default and absence must be representable. Most people show
   nothing in particular most of the time, and "no cue" is a real answer.
3. It is what an onlooker could see, per person per turn — not the person's
   inner state, and never their saved appearance, which is not mutated.
4. It belongs on the turn's own record, written by the producer, and read back
   by the projection. If it is recomputed at render time from live inputs, the
   same saved turn can show a different face on reopening, which breaks replay
   for something the player actually watched.
