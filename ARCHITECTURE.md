# Architecture

## Purpose

The architecture supports a desktop-first persistent political-life simulation whose world can run autonomously, headlessly, and reproducibly. The first build establishes boundaries and invariants, not the complete game.

The [Roadmap](docs/ROADMAP.md) governs long-term sequencing, and [System Dependencies](docs/SYSTEM-DEPENDENCIES.md) is the integration checklist for new persistent concepts. Neither may override the Game Constitution, accepted decisions, or the implemented contracts in this document and `docs/systems/`.

The [Architecture Integrity Audit](docs/ARCHITECTURE-INTEGRITY-AUDIT.md) is the permanent stage-boundary and retroactive compatibility gate. A new architecture rule applies to every completed system it could plausibly affect; an earlier completion label is not an exemption.

## Architecture Integrity

Illustrative examples never silently define an exhaustive universe. Finite state machines, bounded scales, and provenance discriminators remain closed where their semantics require it. Expandable content classifications use catalogs or validated semantic namespaces and stable keys rather than exhaustive prompt-derived unions or arbitrary metadata bags.

Stage acceptance is behavioral. A feature must perform its intended headless simulation behavior with correct actor, time, subjective access, scope, history, provenance, determinism, and persistence. Interfaces, diagnostics, placeholders, and manual fixtures are evidence or tooling, not substitutes for end-to-end capability.

When a rule changes, affected earlier systems are confirmed, corrected, assigned a concrete dependency-bound migration, or superseded. Future autonomous systems that depend on mutable law or rules must resolve the effective rule for their actor, scope, and simulated date; Stage 4 records that future contract without implementing law or institutions.

## Dependency Direction

```text
React viewer (src/ui, src/App.tsx)
                 |
                 v
Pure simulation API (src/simulation/index.ts)
                 |
                 v
Domain state + deterministic transitions + history

Node desktop adapter (src/persistence)
                 |
                 v
          SQLite snapshots
```

- `src/simulation/` contains JSON-safe domain types, deterministic utilities, world operations, policy and mind catalogs, append-oriented history, sparse political and character-mind records, subjective-perception projections, the general decision evaluator and political-belief adapter, persistent organizations/work/education/participation/households/care/child-authority history, qualitative life-load resolution, a future-rule eligibility consumer, progressive entity detail, and the demo scenario.
- `src/persistence/` contains Node-only durable-storage adapters and depends on the public simulation snapshot codec.
- `src/cli/` contains Node-only executable entry points.
- `src/ui/` contains React components that present and invoke the simulation API.
- `src/App.tsx` composes the developer viewer; `src/main.tsx` is the browser entry point.
- `data/snapshots/` is reserved for versioned real-world source material, never live save history.

The UI may depend on the simulation. The simulation must never depend on React, browser globals, UI state, SQLite drivers, paid APIs, or graphical execution.

## Simulation Boundary

The simulation owns world state and all transitions. UI code submits explicit actions and reads returned state; it does not directly invent domain facts.

The initial domain includes:

- a JSON-safe `World` with a stable ID, normalized seed, current simulated date, entities, action sequence, generator version, and history;
- stable-ID `Person` and `Jurisdiction` entities;
- lightweight and materialized person detail states;
- immutable typed biography facts for birth, place, residence, family, education, and occupation;
- historical events with unique semantic keys, stable IDs, simulated timestamps, visibility, tags, structured context, typed participants, involved entity references, and explicit person-fact constraints when history owns a biographical dimension;
- distinct append-only memories, event knowledge, claims, and relationship interactions that may disagree without changing canonical truth;
- a shared stable policy catalog containing domains, issues, propositions, knowledge subjects, and broad principle definitions;
- sparse append-only proposition exposures, private beliefs, public positions, campaign commitments, principles, and subject-knowledge records;
- a separate stable mind catalog containing sparse personality-tendency and personal-value definitions without ideology or policy mappings;
- sparse append-only personality, value, goal-state, appraisal, perception, temporary-state, and durable decision-trace records;
- stable organizations with effective-dated profiles; actual or expected work relationships with separate role/status history; actual or expected organization-linked education and non-work participation with separate lifecycle history; temporal households and memberships; and separate kinship, partnership, care, and person-or-organization child-authority histories;
- ranged time-demand profiles and qualitative deterministic load/recovery resolution over active work, care, and exceptional commitments, reusing temporary states for fatigue;
- an explicit observer/person control state that protects a controlled person's major internal choices from autonomous application;
- reusable query helpers over facts, event tags, age, geography, experience, relationship context, stable organization work/education/participation, households, kinship, partnership, care, child authority, life load, proposition history, principles, knowledge, expertise, character mind, perception, and decision traces;
- a pure general decision evaluator with hard constraints, conflicting soft considerations, isolated bounded randomness, source snapshots, and separate proposal/application steps;
- autonomous political-belief formation as the first domain adapter over that evaluator; and
- deterministic time advancement and demo occurrence generation.

Names and collection positions are not identity. Entity references use stable IDs. World construction validates and defensively copies caller-owned entity graphs. State-changing transitions return new objects and do not mutate their input world; an idempotent no-op may return the unchanged input object.

## Determinism

For a fixed generator version, the same normalized seed, starting state, and ordered valid actions must produce the same material state and history. Different seeds must vary meaningful generated content, not merely seed metadata.

All stochastic behavior in the simulation passes through `SeededRng`. It combines a pinned seeded algorithm with non-consuming keyed forks. A person materialization stream is derived from the world seed and stable person ID; a time-advance occurrence stream is derived from the seed and time-action sequence. A decision stream is derived from the stable decision and actor IDs and then forked by stable option key. UI selection, render order, person materialization, option order, or evaluation of another actor cannot consume randomness that changes a decision.

Persistent IDs are hashes of explicit stable keys, not random draws, names, or display positions. An event's semantic key is unique within a world, is stored with the event, and determines its ID; action parameters therefore belong in keys when they distinguish occurrences. Event sequence separately records append order.

World schema version 7, generator version `demo-world-v7`, person-materialization version 4, policy- and mind-catalog versions, and snapshot format version 6 are stored explicitly. Older world and envelope versions are rejected because no migration chain is promised yet. This build promises same-version reproducibility only; Run A does not fabricate migration sequence for legacy biography facts.

## Time

Simulation dates are validated `YYYY-MM-DD` strings. Calendar arithmetic uses UTC-safe, date-only functions and never local time, locale parsing, or the machine clock. Time advancement is a positive whole-day action. Its system history record makes clock transitions auditable without pretending they are political occurrences.

## Progressive Resolution

A lightweight person has a stable identity and established facts. Materialization adds deterministic, stored background detail without changing the person's ID, name, birth date, home jurisdiction, established facts, simulated date, or history.

Materialization is additive, idempotent, order-independent, and not itself an in-world event. The first materializer checks established fact kinds and explicit person-fact constraints in canonical history; constrained fields remain unknown. Adding a later historical constraint that conflicts with stored generated detail is rejected atomically. Future materializers must retain this contract, leave details unknown when no consistent result is available, and retain the generator version used.

Education and occupation facts carry stable knowledge-subject IDs. Materialization can therefore add fact-derived categorical expertise without assigning beliefs, principles, goals, personality, or ideology. Those `PersonFact` records retain their existing IDs and no append sequence is fabricated: they are compatibility/background summaries, while canonical detailed education, work, co-residence, participation, care, and authority use sequence-aware Stage 5 histories. Organizations follow the same resolution principle: a lightweight organization already has stable identity and effective-dated profile history, and promotion to detailed resolution is nondiegetic and preserves every reference. Progressive resolution affects computational detail, not whether an entity has existed historically.

## History

History is append-oriented and is the basis of explanation, archives, memories, relationships, political evolution, character development, decisions, ordinary life, and returning-player briefings. Canonical events, subjective memories, person-specific event knowledge, claims, relationship interactions, proposition exposures, private beliefs, public positions, campaign commitments, principles, subject knowledge, personality tendencies, personal values, goal states, appraisals, perceptions, temporary states, durable decision traces, organizations and profiles, work relationships/statuses/roles, education enrollments/states, organization participations/states, households/locations/memberships, kinship, partnerships, care responsibilities, child authorities/states, life commitments, and load resolutions are separate record families sharing one global sequence. Corrections, disputed claims, inaccurate knowledge, changed interpretations, renamed organizations, transfers, promotions, moves, leave/return, changed care, ended authority, and later statements are new linked records rather than silent rewrites.

An event's rich context preserves location and setting, participants and roles, visibility, tags, social pressure, choice, motivation, and immediate reaction when known. Knowledge provenance distinguishes direct experience, another person's account, public record, media, and rumor. A claim explicitly records its relationship to historical truth but never changes that truth. Causal graphs, automatic knowledge propagation, and correction records remain future extensions.

Private belief is proposition-specific and categorical across position, conviction, salience, and flexibility. Absence means no formed belief, not neutral. A separate sparse proposition-exposure record distinguishes never encountering a question from encountering it without forming a view. Principles, personal values, personality tendencies, public speech, campaign commitments, expertise, and historical behavior remain distinct.

Explicit political and mind records can reference only validated information available to the person before the record or decision cutoff. A closed typed life-record reference lets perception, appraisal provenance, and decisions cite person-involved canonical Stage 5 evidence without routing it through `PersonFact`; the record must exist and precede both the as-of date and exclusive append-sequence cutoff. Event context that the person neither experienced nor knows is rejected rather than becoming an omniscient rationale. A person-sourced trusted cue requires a perception with an actual earlier communication record and relationship provenance; another person's private belief is never read as communicated information.

Person history in the viewer is a query over the canonical global event store. Political histories and knowledge profiles are queries over their corresponding sparse record families and factual biography; none is maintained as a mutable score vector on `Person`.

Actual work is a stable relationship rather than a current-career field or employer string. Expected future work is recorded before its planned start but remains inactive until a dated lifecycle transition. Occupation facts remain biography/expertise summaries. A household is distinct from family, partnership, care, dwelling, and jurisdiction; membership and location histories preserve co-residence and valid multi-residence without inferring kinship. Care can be shared and cross-household.

Education enrollment is a stable person-to-organization relationship rather than school-name text. Expected enrollment remains inactive until a dated activation, and completion, withdrawal, transfer, or ending appends state. Non-work participation is distinct from both education and actual work; meaningful recurring activity demand is an ordinary life commitment. Child authority is a separate child-to-person-or-organization structural relationship and neither implies nor is inferred from kinship, co-residence, partnership, or care.

Time demand preserves a weekly range plus attention, concurrency, schedule rigidity, interruptibility, and optional location constraint. Life-load assessment derives qualitative pressure from active work, care, and exceptional commitments; it does not subtract all duties from 168 hours or expose a universal life score. A resolved seven-day period can trade immediate output for later fatigue or recovery. Resulting fatigue is an ordinary effective-dated Stage 4 temporary state, not a parallel subsystem or player meter. See [Core Life](docs/systems/life.md).

## Character Mind, Perception, and Decisions

The shared `MindCatalog` defines extensible personality tendencies and personal values once per world. A person stores only the sparse historical records that exist for them. Tendencies use definition-specific expressions rather than forcing every characteristic into a bipolar axis. Values remain separate from political principles and policy beliefs. Goals retain one stable conceptual ID across append-only state changes.

Appraisal is personal meaning, not event truth or memory. Two people can appraise one event differently, and absence of an appraisal is valid. A later reinterpretation is an explicitly linked record; it never edits the event, memory, or earlier appraisal. Development proposals are non-applying suggestions backed by source records, not automatic numerical mutations.

Subjective perception is built from person-owned facts, memories, event knowledge, accessible claims, relationship episodes, proposition exposure, subject knowledge, appraisals, explicit perceptions, and active temporary states. Historical decision input uses both an as-of date and an exclusive history-sequence cutoff, preventing a later-appended backdated record from leaking into an earlier evaluation. Because legacy biography facts do not carry append-sequence availability, they are eligible only at the current date/current history frontier; durable traces freeze their exact source labels and content for later explanation. Canonical Stage 5 life sources use ordinary date-plus-sequence availability and freeze the resolved evidence that a decision actually used.

The decision evaluator is pure: it validates and canonically orders options, applies hard constraints before scoring, retains every supporting or opposing consideration, and allows only slight keyed random influence when at least two available options are within the close-choice window. Blocked or clearly separated options receive no random influence. Consideration source types are open semantic keys under validated `mind`, `belief`, `information`, `social`, `context`, `institution`, or `domain` namespaces. Every non-context source requires a resolvable provenance reference; context sources still require a stable key and explanation. Evaluation creates a proposal and structured explanation, not a canonical action. Consequential traces can be appended durably; routine evaluations may remain ephemeral. Domain application is separate and must create the appropriate belief or future event exactly once.

The first adapter evaluates seven political-belief outcomes: no opinion, defer, conflicted, tentative support, support, tentative opposition, and opposition. The no-opinion default is an honest `context:opinion-readiness` consideration rather than a mislabeled risk. No-opinion and defer outcomes record the durable reasoning trace but create no private belief. Other NPC outcomes append or supersede the Stage 3 private-belief record and link its formation to the earlier trace. A substantive proposal supplies conviction, salience, and flexibility explicitly; the selected side does not alias those independent belief dimensions. Autonomous application rejects the currently controlled person; evaluation remains available so a future UI can present player choices.

## Institutions and Geography

Generic code models worlds, jurisdictions, people, organizations, ordinary life, history, and character decisions. Lexington-Fayette-specific facts and rules belong in a jurisdiction definition or sourced snapshot. Stable `Organization` identity is the shared extension seam for schools, employers, associations, parties, campaigns, agencies, courts, and other institutions. Run A uses it for education, participation, and organization-held child authority but does not implement organization hierarchies, powers, offices, law, or finance. A pure eligibility-consumer seam accepts actor, action, date, stable jurisdiction, context, and structured allowed/blocked reasons; institutional rules that can lawfully change must eventually be supplied by Stage 7 effective-law resolution rather than hard-coded constants.

The product's resolution hierarchy is explicit: Lexington-Fayette is the initial deeply modeled jurisdiction, Kentucky begins at medium resolution, and the United States begins at lower resolution. Those are product targets, not permission to hard-code one jurisdiction's institutions into generic simulation logic.

The first build's Lexington-Fayette jurisdiction is a synthetic placeholder and asserts no detailed real-world civic facts. Kentucky and United States simulation layers are not implemented yet.

## Data Domains and Persistence

Real-world starting data and simulated save history are separate domains:

1. An immutable, sourced snapshot may initialize a new world.
2. The save records exactly which snapshot was used.
3. After initialization, simulated events are authoritative for that save.
4. Updating a repository snapshot never silently rewrites an existing save.

The pure simulation exposes a versioned JSON snapshot codec that validates stable identity, entity ordering, policy- and mind-catalog definitions, control references, biography and life-graph invariants, political/mind/life chronology and provenance, lifecycle and supersession chains, typed life-source availability, historical cutoffs, decision-source snapshots, references, and contiguous history sequence at the persistence boundary. A Node-only `SqliteWorldRepository` stores the complete validated snapshot in a strict SQLite table and supports save, load, update, and list operations. SQLite code remains outside `src/simulation/`, so headless domain execution and browser diagnostics do not depend on a storage driver.

This first repository intentionally stores one current snapshot per world rather than prematurely normalizing every domain record into SQL tables. Migration chains, transactional action journaling, branch lineage, recovery policy, and cross-version compatibility remain deferred.

The Vite/Sites static package is only a temporary host for the developer viewer. It is not the desktop product runtime or a persistence-platform decision.

## External Systems

The simulation runs without an LLM, paid model call, network connection, or external AI API. Future optional content assistance must not become a condition of deterministic simulation.

This is an independent work. Proprietary code, assets, text, data extraction, or implementation from _The Political Process_ or any other game is prohibited.
