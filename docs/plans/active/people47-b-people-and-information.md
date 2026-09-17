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
