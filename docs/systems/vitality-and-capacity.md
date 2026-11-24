# Vitality and Functional Capacity

Stage 6 Run E adds a bounded life-status seam for individual people. It records
death and broad action capacity without creating a medical model or estate
system.

## The retired annual check (old saves only)

Stage 6 Run E once had a second death engine: a scheduled birthday check that
compared one seeded draw with a life table's annual probability. It never had a
production caller, and it decided a death by a draw, so it was removed (audit
item A130). Nothing schedules, handles or writes a `vitality:mortality-check`
item, plan or result now.

Ordinary deaths come from one engine: `crisis/mortality.ts` writes each death
on its crossing day from the person's recorded health and hazard (see
`crisis-severe-events.md`), and the disaster and international producers write deaths from
their own recorded events. All of them go through `recordPersonDeath`.

An old save may still carry the check's records: `VitalityCatalog` tables,
`mortalityCheckPlans`, `mortalityCheckResults`, their due items and a death the
check wrote. The reader keeps them and validates their links (plan, due item,
result, death and terminal due states) as written. It no longer re-rolls a
stored result's draw, since the code that drew it is gone; the recorded outcome
is read as recorded. An old save never had a pending check, because no
production path ever scheduled one.

## Death and functional-capacity history

`recordPersonDeath` appends one `PersonDeathRecord` per person and an exactly
linked ordinary `person.died` event. Reserved death and capacity-change events
cannot survive integrity without their one matching domain record. A death
an old save's annual check wrote additionally requires its exact died result. The record
preserves occurrence and recording dates, a namespaced cause, canonical source
entities, and provenance; it does not delete or mutate the person or earlier
history. A death may be
recorded after its occurrence, but date plus exclusive global sequence controls
when it is visible. Consequently a later-appended backdated death cannot leak
into an earlier historical frontier. `isPersonAliveAt` is false before birth
and after a visible death.

Functional capacity is a small append-only status history: `capable`,
`limited`, or `incapacitated`. A living person with no record defaults to
`capable`; a deceased or not-yet-born person has no current capacity.
`recordPersonFunctionalCapacity` records only an actual change, links an
ordinary `person.capacity-changed` event, and linearly supersedes the prior
record without moving effective dates backward. A later `capable` record can
represent recovery. Capacity cannot change after death.

`personFunctionalCapacityAt` and `isPersonAliveAt` use both effective or
occurrence date and an exclusive append-sequence cutoff. Same-day and
later-recorded history is therefore reconstructible without query-time
rewriting. Ordinary historical events may still refer to a deceased person;
vitality blocks actor action, not posthumous history, remembrance, or reference.

## Common actor availability

`personActionAvailabilityAt` is the shared vitality gate. Death and
`incapacitated` capacity block action with explicit reason keys. `limited`
capacity remains allowed and carries a reason so a domain can apply narrower
rules; it is not silently treated as incapacity.

`evaluateLifeEligibility` applies that gate before an injected domain provider
and combines their structured reasons. A vitality blocker short-circuits the
provider. An actor-initiated incident requires exactly one actor and uses the
same availability rule when an occurrence is committed; incident integrity
rechecks that actor at the onset event's date and exclusive sequence. Omitting
actor identity cannot evade the gate. Thus a limited actor may act, while a
deceased or incapacitated actor cannot initiate an incident.

## Persistence and limits

Catalog definitions, plans, results, deaths, capacities, ordinary events, and
due lifecycles share deterministic IDs, the contiguous global history sequence,
exact JSON persistence, and load-time integrity. Corrupt probabilities, RNG
results, birthday chronology, event links, supersession, provenance, due links,
and post-death capacity are rejected rather than repaired.

Run E does not add daily rolls, automatic materialization, population-wide
mortality scheduling, disease progression, diagnoses, treatment, disability
law, health meters, automatic work or relationship termination, population
metric mutation, inheritance, probate, or estates. Death does not itself move
money, property, tenure, obligations, or other life records. A later estate
system may consume the existing explicit resource-flow and transfer-outcome
seam; this implementation neither invokes nor extends that seam.
