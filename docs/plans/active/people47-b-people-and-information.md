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
