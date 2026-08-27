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
- canonical actual or expected education enrollments linked to stable organizations, with append-only completion, withdrawal, transfer, and ending history;
- stable non-work organization participation with open activity/role/context semantics, kept distinct from enrollment and actual work;
- temporal households, locations, and primary/secondary/shared memberships kept separate from kinship, partnership, and cross-household care;
- separate effective-dated child authority held by a person or organization without inferring kinship, care, partnership, or co-residence;
- exact integer-minor-unit personal/household resource positions and typed person/household/organization flow endpoints, with effective terms and separate completed/partial/missed/blocked outcomes;
- effective work-compensation amount/cadence terms linked to canonical paid work, explicit pay-period resolution, major obligation/debt state, and structured affordability without a banking or credit-score model;
- stable sparse dwellings plus separate person/household occupancy and tenure/ownership/lease/assignment histories;
- care/support flows that may cross households without inferring care, kinship, partnership, authority, or co-residence;
- meaningful relationship contact, missed-opportunity, support, and reconnection composition through ordinary events/interactions/time/subjective records without an upkeep meter;
- closed typed canonical-life source references for historically available Stage 5 evidence used by Stage 4 perception and decisions;
- a deterministic injected life-eligibility consumer returning allowed/blocked decisions and structured open reason keys without hard-coded age law;
- reusable ranged time-demand profiles and qualitative deterministic load, push, fatigue, and recovery behavior over work, care, and exceptional commitments;
- lightweight people that can be materialized deterministically;
- monotonic simulated-time advancement;
- a versioned JSON snapshot codec and Node-only SQLite world repository that preserve both catalogs, control, political, mind, and life histories plus decision traces; and
- a headless demo that creates a seeded world and Lexington-Fayette placeholder, generates six lightweight people, advances time, records contextual, Stage 4, and Stage 5 diagnostic histories, materializes one existing person, and replays the scenario to demonstrate reproducibility.

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

Stage 6.5 Run A now makes a separate player-facing office scene the default
browser entry point while retaining this accepted diagnostic viewer at
`?view=developer`. Run A does not reinterpret the diagnostic sections as player
knowledge; it uses the separate bounded epistemic projection documented in
[Player Presentation and Epistemic Projection](systems/player-presentation.md).

Stage 6.5 Run B extends that same scene with a controlled-player/two-NPC room,
direct Talk actions, a compact conversation strip, separate addressee and
audibility controls, and deterministic authored NPC dialogue. Ephemeral session
state remains outside World. A committed turn replaces the session's immutable
World after composing existing NPC decision, event, claim, knowledge,
perception, and qualitative relationship writers on the same date. It adds no
new persistence shape, sub-day clock, universal dialogue/acoustic engine,
legislation/calendar workspace, runtime AI, or Stage 7 institution/law truth.

Stage 6.5 Run C adds one separate bounded Transit Access Pilot office working
draft. It presents stable provisions and real DOM legal text over existing
quantitative policy alternatives/operations/estimates, filters staff analysis
through ordinary actor knowledge, reuses the Run B strip for one provision
discussion, and records one office-draft instruction as ordinary history. It
does not implement a bill, law, appropriation, institution, procedure, or policy
realization.

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
- Education enrollment uses stable organization identity, remains inactive while merely expected, preserves transfers and school renames, and takes precedence over legacy education-summary text.
- Non-work participation remains separate from work and education; meaningful recurring demand reuses life commitments instead of creating another scheduler.
- Household, dwelling/location, kinship, partnership, and care remain separate; care may cross households, unrelated people may co-reside, and valid secondary/shared residence does not create a duplicate primary home.
- Child authority remains separate from household, kinship, partnership, and care and may be held by a person or organization.
- Work compensation remains separate from work role/status and produces liquid resources only through explicit actual outcomes; expected cadence does not post money by itself.
- Money uses safe integer minor units and validated currency identity. Tracked source/recipient positions reconcile committed outcomes without floating drift or arbitrary balance mutation.
- Obligations and optional debt principal remain separate from actual payments; affordability is a derived structured explanation rather than a wealth, credit, or financial-wellbeing score.
- Household identity, household location, dwelling identity, occupancy, and tenure/ownership remain separate. A resident need not own or lease, an owner need not reside, and a move does not create a new household.
- Financial support and care cost never infer structural family/care/household truth.
- Meaningful relationship effort and missed opportunities are ordinary history; inactivity is not deletion or automatic hostility, and no maintenance meter exists.
- Explicit resource pressure enters mind/decision behavior only through actor-relevant typed evidence, knowledge, appraisal, and bounded temporary state.
- Later-appended backdated canonical life records remain unavailable through an earlier exclusive-sequence cutoff and cannot leak into an earlier perception or decision.
- Legacy `PersonFact` IDs and nondiegetic materialization remain unchanged; canonical Stage 5 life truth wins when present, and no fake fact sequence is introduced.
- Life eligibility is supplied through a replaceable provider using stable jurisdiction identity and structured reasons; the foundation embeds no universal age threshold or 50-state list.
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
- elections, campaigning, full legislation/procedure, political institutions/offices, mutable law, staff systems, polling, media simulation, generalized event causality/economy, deep autonomous career progression, campaign/organization/government finance, banking/credit/investments/tax, property markets/maintenance, or full NPC autonomy; the bounded Stage 6.5 Run C working-document bridge is the only current legislative-work exception;
- hourly calendars, automatic scheduling, health simulation, or player-facing workload, fatigue, personality, trust, or relationship meters;
- autonomous personality/value/relationship development, background population-scale opinion change, automatic knowledge propagation or memory recall, or political action classification;
- final UI, art direction, or production content;
- an LLM or external AI runtime dependency;
- the complete target vertical slice.

## Target Vertical Slice — Planned, Not Implemented Here

Future work is expected to prove:

- seeded world generation;
- Quick and Manual character creation;
- deeper production formative-childhood content beyond the bounded implemented situations;
- full interactive adult Life Mode beyond the implemented compositional paths;
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
