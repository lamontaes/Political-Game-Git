# First Build Specification

## Objective

Establish the repository, authoritative documentation, validation infrastructure, and a deterministic persistent character/history foundation that can execute independently of React.

This build is foundational infrastructure, not the complete first playable vertical slice.

## Required Deliverables

### Simulation

The build provides:

- a seeded deterministic RNG abstraction with non-consuming keyed forks;
- stable entity IDs;
- typed, immutable biography facts for birth, birthplace, residences, family, education, and occupation;
- context-rich historical events with participants, visibility, tags, and structured circumstances;
- an append-oriented history store for events, memories, knowledge, claims, and relationship interactions;
- generic historical queries by person, age, tags, geography, experience, relationship context, and shared work;
- a stable data-driven policy catalog with domain, issue, proposition, knowledge-subject, and broad-principle definitions;
- sparse append-only proposition exposures, private beliefs, public positions, campaign commitments, principles, and structured subject knowledge;
- categorical belief dimensions and knowledge/expertise dimensions with provenance and no universal ideology normalization;
- political queries for exposure/no-view state, current and historical positions, dated changes, commitments, principles, domain coverage, resolved formation provenance, subject knowledge, and practical experience;
- lightweight people that can be materialized deterministically;
- monotonic simulated-time advancement;
- a versioned JSON snapshot codec and Node-only SQLite world repository that preserve the catalog and political histories;
- a headless demo that creates a seeded world and Lexington-Fayette placeholder, generates six lightweight people, advances time, records events, materializes one existing person, and replays the scenario to demonstrate reproducibility.

### Developer Viewer

The React viewer allows a developer to:

- create or reload the in-memory demo world with a text seed;
- see the active seed, stable world ID, current date, placeholder jurisdiction, people count, and event count;
- advance simulated time by seven days;
- list generated people and their detail state;
- select a person without mutating simulation state;
- inspect structured biography facts, generated detail, and a combined person timeline;
- explicitly materialize a lightweight person;
- inspect global event context, participants, known-by records, claims, and involved entities;
- inspect memories and relationship-interaction history without raw personality or relationship meters.
- inspect proposition exposure, private-belief history, public positions, commitments, principles, complete subject-knowledge history, fact-derived expertise, and resolved provenance without raw ideology or personality scores.

This is diagnostic UI, not final game art or final player-facing information design.

### Required Invariants

- Same seed plus same ordered actions yields the same result for the same generator version.
- Different seeds vary meaningful generated facts.
- IDs are unique and do not change after time advancement or materialization.
- Time never moves backward.
- Materialization only adds compatible detail.
- Previously established facts and history references survive materialization unchanged.
- Historical events retain simulated timestamps and involved entity IDs.
- Historical truth is not mutated by later memory, knowledge, or claim records.
- Contextually different events remain distinguishable even when they share a broad category.
- Minor early-life events remain queryable after decades of simulated time.
- Never encountered, encountered without a formed view, and formed proposition beliefs remain distinct sparse states rather than becoming synthetic neutral values.
- Related propositions can retain different positions, while private belief, public position, and campaign commitment can disagree without overwriting one another.
- Principles and factual education/occupation expertise never automatically assign proposition positions.
- Knowledge and conviction remain independent; high expertise can coexist with uncertainty and low knowledge with strong conviction.
- A catalog with thousands of propositions leaves per-person political state sparse.
- Versioned serialization and SQLite loading preserve the complete world graph.
- The core executes under Node without React or a graphical environment.
- Simulation randomness never bypasses the seeded RNG.
- Placeholder content cannot be mistaken for sourced real-world data.

## Explicitly Out of Scope

This build does not implement:

- cross-version migrations, branch persistence, recovery tooling, or a production desktop save picker;
- detailed or purportedly factual Lexington civic data;
- elections, campaigning, legislation, staff, polling, media simulation, full career/family behavior, or full NPC autonomy;
- automatic NPC opinion formation, generated personality-driven beliefs, political action classification, or a final personality/goals model;
- final UI, art direction, or production content;
- an LLM or external AI runtime dependency;
- the complete target vertical slice.

## Target Vertical Slice — Planned, Not Implemented Here

Future work is expected to prove:

- seeded world generation;
- Quick and Manual character creation;
- formative childhood events;
- adult Life Mode;
- detailed weekly mode;
- civilian education/work;
- persistent characters beyond the implemented life-history foundation;
- progressive NPC generation;
- autonomous political belief formation and change over the implemented sparse belief foundation;
- autonomous memory recall and behavioral consequences;
- autonomous relationship decisions and asymmetric trust;
- perceptions;
- deeper expertise effects on options, capability, and reasoning;
- personality and goals;
- political volunteering;
- candidate recruitment;
- Lexington council campaign;
- voter populations;
- fundraising;
- staff;
- polling uncertainty;
- media/interviews;
- speeches;
- debates/forums;
- endorsements;
- winning and losing;
- Lexington councilmember gameplay;
- committees;
- legislation composed from provisions;
- amendment and negotiation;
- staff delegation;
- history/archive;
- returning-player briefing;
- primitive Observer Mode; and
- branchable world states.

## Completion Gate

The build is complete only when:

- all required documentation exists and agrees with the Constitution;
- `npm run demo` executes headlessly;
- the development viewer supports the required inspection flow;
- automated-now acceptance tests pass;
- `npm run validate` passes;
- the active plan has a completion record and is moved to `docs/plans/completed/`.
