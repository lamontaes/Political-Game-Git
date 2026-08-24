# Vitality and Functional Capacity

Stage 6 Run E adds a bounded life-status seam for individual people. It records
explicit birthday mortality checks, death, and broad action capacity without
creating a population process, medical model, or estate system.

## Exact mortality catalog and explicit plans

`VitalityCatalog` (`vitality-catalog-v1`) stores stable mortality-table
definitions. Each table contains strictly increasing, non-negative integer ages
and one canonical exact bounded `rate:share` annual probability for every age it
supports. Lookup is exact: the engine does not interpolate, extrapolate, or
substitute a rate for an omitted age. The current built-in tables are synthetic
zero- and unit-probability validation fixtures, not actuarial content.

`schedulePersonMortalityCheck` is an explicit action for one materialized
person and one future birthday. It does not materialize a person, scan the
population, or schedule from ordinary time advancement. The canonical plan
freezes person, table, check year, birthday, age, and the table's exact
probability at its append frontier. Scheduling rejects context-only people,
unsupported ages, past or current birthdays, duplicate person/year plans, a
deceased person, and a second active check.

Birthday arithmetic uses the person's stored birth date. A February 29 birth
uses February 28 in a non-leap check year, and `ageOnDate` uses the same rule.

## Run A resolution and keyed randomness

Run A's `FutureDueItem` remains the sole scheduler. Every mortality plan is
followed immediately by exactly one due item with transition key
`vitality:mortality-check` and exactly the plan ID as its domain reference.
Integrity rejects a generic due item that bypasses a canonical plan or changes
the plan-derived stable key, date, reference, sequence, or provenance. The
`mortalityTransitionHandler` participates through the ordinary injected Run A
handler registry; there is no second mortality clock. It may execute only at
the exact due-date frontier and only after every earlier Run A item by due date
and creation sequence has terminally settled.

At the birthday frontier, `mortalityRngForPlan` derives a stable key from the
world seed and the plan's person, table, year, date, and age identity. It uses a
non-consuming `SeededRng` fork and compares one integer draw to the exact stored
probability. Unrelated RNG consumption cannot reroll the result; `0/1` always
survives and `1/1` always dies. The persisted key, draw, outcome, probability,
and links are reconstructible during integrity and load checks.

A survival result schedules exactly one next birthday when the same table has
an explicit entry for the next age, and none when that terminal age is
unsupported. It cannot switch tables. Death records the result and schedules
no follow-on. A persisted handler checkpoint before Run A writes the terminal
state is idempotently resumable without another draw, result, death, or
follow-on. Once Run A terminalizes that checkpoint, the exact terminal sequence
and any later authoritative time-advance event prove it was not retroactively
repaired after an overdue frontier. If another valid death record makes a once-valid pending plan
obsolete, the due item terminally cancels with the exact canonical key, date,
reason, context, and null outcome required by
`vitality:person-no-longer-alive`; it cannot also produce a result. Resolved
items likewise reconstruct their exact terminal metadata.

## Death and functional-capacity history

`recordPersonDeath` appends one `PersonDeathRecord` per person and an exactly
linked ordinary `person.died` event. Reserved death and capacity-change events
cannot survive integrity without their one matching domain record. A
mortality-caused death additionally requires its exact died result. The record
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
