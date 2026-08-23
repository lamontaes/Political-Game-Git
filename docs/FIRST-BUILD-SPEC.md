# First Build Specification

## Objective

Establish the repository, authoritative documentation, validation infrastructure, and a deterministic persistent character/history and decision foundation that can execute independently of React.

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
- a stable data-driven mind catalog with sparse append-oriented personality-tendency and personal-value histories, categorical descriptions, provenance, and supersession;
- persistent goal-state histories, event appraisals, explicit subjective perceptions, and expiring temporary-state records;
- historical/as-of queries for personality tendencies, personal values, goals, appraisals, perceptions, temporary states, and durable decision explanations;
- subjective-perception projection from information available to one person at an as-of date and exclusive history-sequence cutoff;
- non-applying, provenance-bearing development proposals for personality, values, goals, or relationships;
- a general pure decision evaluator with stable options, absolute hard constraints, conflicting soft considerations, source snapshots, qualitative explanations, and isolated keyed bounded randomness;
- separate evaluation, ephemeral or durable trace retention, NPC application, and canonical domain-consequence layers;
- a political-belief formation adapter supporting no opinion, defer, conflict, tentative support/opposition, and stronger support/opposition without reading unknown truth or another person's private belief;
- explicit observer or controlled-person world state that rejects silent autonomous application of a controlled person's major internal choices;
- stable organizations with effective-dated names, classifications, locations, provenance, and progressive detail;
- multiple concurrent actual or expected work relationships with separate status and role/occupation histories plus compensation, authority, dependency, and risk semantics;
- temporal households, locations, and primary/secondary/shared memberships kept separate from kinship, partnership, and cross-household care;
- reusable ranged time-demand profiles and qualitative deterministic load, push, fatigue, and recovery behavior over work, care, and exceptional commitments;
- lightweight people that can be materialized deterministically;
- monotonic simulated-time advancement;
- a versioned JSON snapshot codec and Node-only SQLite world repository that preserve both catalogs, control, political, mind, and life histories plus decision traces; and
- a headless demo that creates a seeded world and Lexington-Fayette placeholder, generates six lightweight people, advances time, records contextual, Stage 4, and Stage 5.1 diagnostic histories, materializes one existing person, and replays the scenario to demonstrate reproducibility.

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
- inspect memories and relationship-interaction history without raw relationship meters;
- inspect personality-tendency, personal-value, goal, appraisal, explicit-perception, and temporary-state histories;
- inspect the objective event beside a person's appraisal without presenting either as the other;
- inspect current subjective-perception item count and recent durable decision traces with qualitative options, blockers, considerations, and frozen source explanations; and
- inspect proposition exposure, private-belief history, public positions, commitments, principles, complete subject-knowledge history, fact-derived expertise, and political-formation reasoning without raw ideology, personality, relationship, trust, utility, or random numbers.

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
- Personality tendencies, personal values, political principles, proposition beliefs, expertise, memories, appraisals, perceptions, goals, temporary states, and canonical events remain separate sparse layers.
- Different people may appraise the same event differently, one may have no appraisal, and a later reinterpretation never changes event truth or the earlier appraisal.
- Subjective perception includes only person-accessible records available before both the date and sequence cutoff; contradictory perceptions may coexist without exposing diagnostic truth.
- Expired temporary states remain historical but no longer enter a later perception snapshot.
- Hard constraints always block an option, while soft considerations and slight bounded randomness cannot make an unavailable option win.
- Decision results are deterministic and option-order independent for the same stable inputs; unrelated actors and UI activity cannot consume randomness that changes them.
- A durable decision trace explains an evaluation but does not become the canonical action or event.
- No-opinion and defer political outcomes create no private belief; applied NPC belief outcomes remain append-only and cite the earlier trace.
- A person-based political cue requires prior communication and relationship provenance; closeness does not imply universal trust and private beliefs do not leak.
- Autonomous application rejects the controlled person even though evaluation and non-applying proposals remain available.
- Organization identity survives profile changes and progressive detail; classifications remain open without becoming arbitrary metadata.
- Occupation biography remains separate from actual work; multiple paid, unpaid, independent, and expected relationships do not overwrite one another.
- Expected future work is queryable but inactive until its dated start transition, while leave, return, promotion, organization change, and ending remain historical.
- Household, dwelling/location, kinship, partnership, and care remain separate; care may cross households, unrelated people may co-reside, and valid secondary/shared residence does not create a duplicate primary home.
- Time demand preserves ranges, concurrency, attention, rigidity, and interruptibility. Concurrent care is not blindly summed as exclusive time, and no universal life score is exposed.
- Short-term pushing may improve immediate output, sustained fatigue can reduce it, and explicit recovery can restore capacity through the existing temporary-state primitive.
- Versioned serialization and SQLite loading preserve the complete world graph.
- The core executes under Node without React or a graphical environment.
- Simulation randomness never bypasses the seeded RNG.
- Placeholder content cannot be mistaken for sourced real-world data.

## Explicitly Out of Scope

This build does not implement:

- cross-version migrations, branch persistence, recovery tooling, or a production desktop save picker;
- detailed or purportedly factual Lexington civic data;
- elections, campaigning, legislation, political institutions/offices, mutable law, staff, polling, media simulation, event causality, formative content, career-content progression, finance/resources, dwellings/property, relationship maintenance, or full NPC autonomy;
- hourly calendars, automatic scheduling, health simulation, or player-facing workload, fatigue, personality, trust, or relationship meters;
- autonomous personality/value/relationship development, background population-scale opinion change, automatic knowledge propagation or memory recall, or political action classification;
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
- population-scale political belief formation and continuing change beyond the implemented NPC proposal/application adapter;
- autonomous memory recall and behavioral consequences;
- autonomous relationship decisions and asymmetric trust;
- automatic perception, attention, communication, and knowledge-propagation behavior beyond the implemented explicit records and subjective projection;
- deeper expertise effects on options, capability, and reasoning;
- formative personality/value development and gameplay that creates or changes the implemented histories and goals;
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
