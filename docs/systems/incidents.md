# Generalized Incidents and Follow-Ons

Stage 6 Run D provides a small reusable incident substrate. It makes a possible
hazard, condition, shock, or actor-initiated civic occurrence inspectable and
historical without adding a random-card storyteller, a second scheduler, or a
parallel narrative-event log.

## Definitions and explicit evaluation

`IncidentCatalog` (`incident-catalog-v1`) stores JSON-safe possible-incident
definitions with stable identity, open kind and tags, mode, exact base
likelihood, typed prerequisites/blockers, typed likelihood modifiers, and
descriptive content. Definitions are catalog metadata, never an occurrence.
The synthetic starter set has a localized natural hazard, a metric-gated
economic slowdown, a bounded outbreak condition, and an actor-initiated civic
adapter. It is intentionally not a territory-specific incident dataset.

`evaluateIncident` is explicit: time advancement does not scan candidates or
produce a daily event tick. The initial closed rule family is deliberately
small:

- exact comparison against an available Run A metric state;
- earlier ordinary historical-event type/tag availability; and
- another definition's active/resolved incident state.

Missing metric truth is explicit `unavailable` evidence, never a fabricated
zero. Rules and modifiers obey the supplied date plus exclusive history-sequence
frontier. An active-incident modifier is an exact bounded multiplicative share;
it can change likelihood but cannot itself force an occurrence.

Probabilistic evaluation derives a stable key from the world seed, definition
key, caller evaluation key, scope, date, and historical cutoff. A non-consuming
`SeededRng` fork produces one integer draw, compared exactly against the bounded
`rate:share` likelihood. Unrelated RNG use cannot reroll an evaluation. An
actor-initiated definition has no RNG draw, but still records the same explicit
eligibility and risk evidence.

`evaluateIncident` first validates the current world, then delegates to one
non-recursive canonical evaluator. Before a loaded or committed occurrence is
accepted, integrity derives that evaluator's input from the immutable snapshot
and reruns it at the snapshot's exact cutoff. The complete result must match:
base/final likelihood, rule and modifier evidence/sources, RNG key/draw/result,
risk factors, scaled consequences, and outcome. A valid older same-day cutoff
therefore remains valid, but it is never silently recomputed at a newer
frontier.

## Risk inputs and Run B consequences

Hazard likelihood is separate from consequence impact. Every evaluation keeps
independent exact bounded `exposure`, `vulnerability`, and `resilience` values.
The initial documented impact rule is:

```text
impact share = exposure × vulnerability × (1 − resilience)
```

Each typed consequence plan supplies a target primitive metric/scope, exact
point or interval reference period, direction, exact base magnitude, accepted
Run B magnitude basis/mechanism/timing, and open realization kind. The impact
share scales the base magnitude; fractional money minor units reject rather than
round. No incident-specific effect equation or modifier state exists.

When an eligible evaluation occurs, one atomic canonical operation commits an
ordinary `incident.occurred` event, one root `incident:occurrence` causal
process, immutable `IncidentRecord` risk evidence, a meaningful ordinary onset
phase event and first active `IncidentStateRecord`, plus exactly linked Run B
effect activations. Later state changes also require ordinary phase events.
The incident's root remains stable across its lifecycle. An immediate effect is
sourced by the onset occurrence; a transition effect is sourced by that
transition's phase event. A policy and an incident may target the same metric,
but their roots remain distinct and Run B's existing root-deduplication query
continues to handle correlated branches.

## State, follow-ons, and queries

`IncidentRecord` is durable identity; `IncidentStateRecord` is append-only
active/resolved phase history with an open namespaced phase key and mandatory
ordinary event. States supersede the prior state rather than mutating an
incident. Resolved incidents remain historical/queryable.

`IncidentTransitionPlanRecord` owns the durable meaning of a delayed phase:
incident, due date, target state, phase/reason/context, optional typed
consequences, provenance, and global sequence. `scheduleIncidentTransition`
creates one ordinary Run A due item with transition key `incident:transition`
and exactly the plan ID as its reference. A plan may be scheduled only while
its source state (the latest state before the plan sequence) is also the latest
active state. Integrity reconstructs that same source state and requires it to
equal the latest active state before the due item's own sequence, as well as
the date/scope/provenance and one-plan/one-due identity. A normal due handler
records the phase and state exactly once. If later incident history already
resolves or advances the incident, the now-obsolete item terminally cancels with
`incident:already-resolved` or `incident:state-advanced`; time can cross the
frontier without rewriting history or silently scheduling a replacement.

Cutoff-aware APIs provide incident identity, latest state, active incidents,
definition/kind-and-scope selection, causal root, and the associated ordinary
event history. All are gated by date plus exclusive global sequence, so later
backfill cannot become visible in earlier reconstruction.

## Information, integrity, persistence, and limits

Incident truth creates no `EventKnowledgeRecord`; an existing explicit
event-knowledge writer remains the only person-information bridge. Run D adds no
media, reporter, discovery, evidence, secrecy, or universal knowledge system.

World schema 13, generator `demo-world-v13`, snapshot format 12, and incident
catalog `incident-catalog-v1` persist definitions, records, states, plans,
snapshots, links, and global sequence through exact JSON and the Node-only
SQLite repository. Integrity rejects malformed definitions or any risk snapshot
that does not exactly reconstruct at its stored cutoff, wrong root/event/effect
or writer-specific provenance linkage, broken state supersession, non-event
phases, malformed outcome plans, invalid or duplicate incident due work,
source-state drift at due creation, and impossible post-resolution active state.

Run D does not implement weather, health, mortality, incapacity, evidence,
recurrence, a macroeconomy tick, law or institutions, elections, media,
territory-specific content, foreign governments, tactical conflict, or a
player-facing UI. Run E owns mortality/incapacity/evidence.
