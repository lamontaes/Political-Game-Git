# Events

The event system determines when contextual occurrences happen and applies their consequences. The history system preserves what occurred.

## Rules

- Major events should generally arise from conditions, earlier events, people, institutions, and decisions.
- Event definitions may include prerequisites, blockers, modifiers, weights, follow-ons, and consequences.
- Random selection uses seeded bounded randomness and must produce plausible variation, not context-free surprises.
- Consequences are contextual; an event type does not imply a universal bonus or penalty.
- Event resolution must identify affected entities and create durable historical records.
- Every committed occurrence has a unique semantic key within its world; parameters that distinguish branch occurrences belong in that key.
- When an event constrains progressive biography, it identifies the affected person and fact kind explicitly rather than relying on summary-text parsing.
- Event handlers must be deterministic for the same state, inputs, ruleset, and keyed RNG scope.
- Progressive resolution may vary how much detail an event receives without discarding meaningful consequences.
- A definition or possible event is not history. Only an occurrence committed by the simulation is history.

## Implemented Foundation

A committed event stores occurrence and recording dates, jurisdiction, visibility, tags, involved entities, typed person participants and roles, optional biography constraints, summary, and structured context. Event types are validated dotted content keys, and participant roles use open semantic namespaces such as agency, observation, impact, or coordination rather than an exhaustive list of example roles. Namespace-aware queries preserve behavior for later valid roles without special-casing individual event content. Context can preserve a labeled location and setting, social situation, pressure, choice, motivation, and immediate reaction. Later remembered accounts belong to memory, later statements belong to claims, and a person's changing interpretation belongs to appraisal records rather than mutations of this truth record.

The deterministic demo uses initialization records, time-advance records, and a synthetic community occurrence with participants, direct knowledge, a memory, a claim, a linked relationship interaction, Stage 4 mind/decision diagnostics, and a small Stage 5.1 organization/work/household/care fixture. Political formation uses only explicit provenance-bearing subjective context; an event does not automatically cause a belief, appraisal, personality change, value change, job, household membership, or care responsibility.

The general decision engine produces an evaluation and optional explanation trace, not a committed event. A later domain adapter that turns a decision into an action must create the canonical event or other consequence exactly once. Duplicate semantic keys, impossible chronology, missing references, unborn participants, and incompatible late biography constraints are rejected before state changes. Conditional event graphs, autonomous event selection, causal consequences, and actor-initiated event scheduling remain deferred to Stage 6 or later.
