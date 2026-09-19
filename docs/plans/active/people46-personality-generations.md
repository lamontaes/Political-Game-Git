# PEOPLE46 — personality, private aims and playable generations

Owner: the PROSE/PEOPLE session (CRUNCH46 section 05). Branch
`claude/prose-contextual-scenes`, stacked on PROSE B.

## Scope and status

| Row | What                                                              | State                                                                            |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| P1  | at least three situations per contextual family                   | done: variants listed below, `contextual-scene-variants.test.ts`                 |
| P2  | five ordinal traits, seeded once, changed only by a cited event   | done: `people-traits.ts`, `people-mind.test.ts`                                  |
| P2  | typed private aims with active/paused/abandoned/achieved          | done: `people-goals.ts` (adapter)                                                |
| P3  | pair relationships, NPC-initiated invitations and reconciliation  | open                                                                             |
| P4  | lie / mistake / uncertainty / evasion; reminders with drilldown   | lie and mistake done (PROSE B); uncertainty and reminders open                   |
| P5  | dated family additions; continue / record / observe; two handoffs | done: `people-family.ts`, `people-continuation.ts`, `people-generations.test.ts` |
| P6  | player-visible loop through UI adapters                           | adapters published; UI (-cf) mounts them                                         |
| P14 | passive childhood                                                 | open                                                                             |

Scene variants per family:

- home-evening: open evening, committed evening, promised evening (plus the
  claim-came-back follow-up).
- favor: friend favor, extra hours, an evening in at home.
- party-invite: invitation, join ask after a meeting, check-in after a no.
- campaign-reaction: filed, election result, first day in office.
- reporter-question: promise question, filing question (plus the
  memory-corrected follow-up).
- staff-followup: pending bill (a governor-staff scene waits for GOVERNING
  records).

## Design

- **Traits.** `people-mind-v1` adds five personality-tendency definitions to the
  mind catalog the first time any trait record is written. New worlds and
  legacy openings stay byte-identical. The seeded value comes from the
  person's own stream. A decision cites a trait through `mind:personality`
  considerations, and only when the trait leans. The controlled character
  never gets a written trait, because the mind layer admits only the player's
  own choices for that person.
- **Aims.** These are goal-state records scoped `people-goal-v1`. They are
  private, take no time, and a closed aim does not reopen. Opportunities come
  from real eligibility, conversation and public-matter records.
- **Family.** A birth or adoption is one dated `life.family-member-added` event
  with validated parent ages. It adds lineal and grandparent kinship, child
  authority, siblings, household membership, and knowledge for those involved.
- **Continuation.**
  - Triggers: any recorded death (CRISIS mortality included) or an explicit
    retirement.
  - Successors: a living child, grandchild or sibling, or a currently active
    partner. A relative under 5 is reached by a disclosed wait with nobody
    played.
  - A handoff writes `game.control-continued` and moves `world.control`.
  - A death also opens a `life.estate-opened` record: pending disposition,
    listing the person-owned positions and tenures, with nothing moved.
  - The successor learns of the death and the estate. Nothing else is copied:
    no knowledge, aims, traits, relationships or office.
  - `game.control-released` records observing.
- **Office.** It is never inherited. Succession stays GOVERNING's.

## Conflicts with durable decisions (for LAND and the owner)

- **D-013** (DEFERRED) lists "taking control of an existing character" as
  future work. CRUNCH46 §05 P5 assigns it now. This work takes control only of
  a real relative after a death or retirement. It is stored as append-only
  events in the same World; there are no branches and no comparison.
- **D-046** says death does not start an "estate, probate, inheritance, or
  automatic resource transfer". This work records only an
  estate-pending-disposition marker that lists holdings. It transfers nothing
  and decides no law, so the spirit of D-046 holds. It is still a new record,
  and a decision entry should say so.

These need a decision-log entry from the owner or LAND. This branch does not
edit the decision log.

## Known limits

- Observer worlds are not yet loadable by the player shell or persistence. UI
  owns that.
- The private journal is keyed per save. Per-person keying is a UI
  commitment.
- Family additions in ordinary play need a producer: a partnership that leads
  to a birth. Today only the command exists.
