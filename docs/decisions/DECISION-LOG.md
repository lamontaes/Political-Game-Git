# Decision Log

The log preserves significant choices and rejected alternatives.

## Statuses

- `ACCEPTED` — current decision.
- `REJECTED` — considered and deliberately not adopted.
- `DEFERRED` — unresolved or intentionally postponed.
- `SUPERSEDED` — formerly accepted, now replaced by a named newer accepted decision.

A superseded entry must name its replacement. A newer accepted entry must name every older decision it supersedes. Update affected authoritative documents alongside an accepted decision so this log does not become a hidden competing specification.

## D-001 — Documentation authority

- Date: 2026-08-21
- Status: ACCEPTED
- Supersedes: none

The Game Constitution is the highest product authority. Current accepted decisions, architecture and system documents, build specifications, tests, and implementation follow beneath it. Conflicts are recorded and resolved explicitly.

Consequence: implementation convenience cannot silently weaken a principle, and behavioral changes require matching documentation and tests.

## D-002 — Pure simulation boundary

- Date: 2026-08-21
- Status: ACCEPTED
- Supersedes: none

Place the domain and headless demo under `src/simulation/`. React components under `src/ui/`, `src/App.tsx`, and `src/main.tsx` may depend on the simulation; the simulation may not depend on UI, DOM, browser runtime, or React.

Consequence: tests and observer-style simulation can run under Node without graphical infrastructure.

## D-003 — TypeScript application stack

- Date: 2026-08-21
- Status: ACCEPTED
- Supersedes: none

Use TypeScript, React, Vite, and Vitest with minimal supporting tooling. Package the static development viewer through the Vite Sites plugin without coupling simulation behavior to hosting. This temporary viewer host is not the desktop product runtime or a persistence-platform choice.

Consequence: framework additions require a demonstrated need rather than speculative complexity.

## D-004 — Keyed seeded randomness and stable IDs

- Date: 2026-08-21
- Status: ACCEPTED
- Supersedes: none

All simulation randomness uses an explicit seeded abstraction with non-consuming keyed forks. Persistent entities and events receive stable IDs from explicit semantic keys, independent of random draw order, labels, display order, and React rendering.

Consequence: same-version seed/action replay is testable, history references survive state changes, and nondiegetic person materialization cannot perturb later world randomness.

## D-005 — Progressive person materialization

- Date: 2026-08-21
- Status: ACCEPTED
- Supersedes: none

People may begin lightweight and gain detail deterministically when relevant. Materialization can add compatible facts but cannot replace identity, contradict established facts or explicit person-fact constraints in canonical history, advance time, or record a fictional in-world event. Stored details retain a generator version; a conflicting later history constraint is rejected rather than rewriting generated biography.

Consequence: large populations can remain computationally tractable without retroactive contradictions or order-dependent biographies.

## D-006 — JSON-safe immutable world state and append-oriented history

- Date: 2026-08-21
- Status: ACCEPTED
- Supersedes: none

Represent world state with plain JSON-safe values and pure state transitions. Use stable append-oriented historical events as the durable basis for explanation. Represent corrections, changed views, and disputed claims through subsequent linked records rather than silent mutation.

Consequence: saves can later cross a persistence boundary cleanly, and archives, memories, relationships, and briefings can share a traceable canonical history.

## D-007 — Data-driven jurisdictions

- Date: 2026-08-21
- Status: ACCEPTED
- Supersedes: none

Keep generic world behavior in simulation code and jurisdiction-specific facts and rules in definitions or sourced snapshots with stable IDs and provenance.

Consequence: Lexington-Fayette begins as an explicit placeholder and does not define universal government behavior.

## D-008 — SQLite as persistence target

- Date: 2026-08-21
- Status: SUPERSEDED by D-015
- Supersedes: none

SQLite is the intended durable persistence store. The first build uses in-memory state while maintaining a simulation-facing boundary that can later receive a SQLite adapter.

Consequence: the foundation does not invent a premature schema, but domain behavior may not couple itself to browser-local storage.

## D-009 — Separate snapshot and save-world domains

- Date: 2026-08-21
- Status: ACCEPTED
- Supersedes: none

Real-world snapshots require provenance and initialize new worlds. Simulated history becomes authoritative after world creation, and snapshot updates do not alter existing saves.

Consequence: historical saves remain internally coherent and reproducible.

## D-010 — No required AI service or proprietary implementation

- Date: 2026-08-21
- Status: ACCEPTED
- Supersedes: none

Core simulation cannot require an LLM, paid model, network service, or proprietary code, assets, text, or implementation from another political game.

Consequence: deterministic offline execution remains possible and the project remains independently implemented.

## D-011 — Implement the complete vertical slice in the foundation build

- Date: 2026-08-21
- Status: REJECTED
- Supersedes: none

Rejected alternative: implement the complete Lexington political-life vertical slice during the foundation task.

Reason: doing so would obscure the architecture, history, determinism, and testing contracts that later systems depend on. The vertical slice remains an accepted future product target.

## D-012 — SQLite schema and save migrations

- Date: 2026-08-21
- Status: SUPERSEDED by D-015
- Supersedes: none

Detailed tables, migrations, repositories, transaction boundaries, and save compatibility policy will be designed after the minimal domain behavior is validated.

## D-013 — Observer branching and control-transfer persistence

- Date: 2026-08-21
- Status: DEFERRED
- Supersedes: none

Branch lineage, taking control of an existing character, durable Observer Mode saves, and branch comparison remain future work. Current structures must avoid foreclosing them.

## D-014 — Rich history knowledge and claim schema

- Date: 2026-08-21
- Status: SUPERSEDED by D-016
- Supersedes: none

The minimal event record does not yet model participant roles, witnesses, who learned about an event, competing claims, causal links, or visibility. Those fields require a dedicated design before persistence is fixed.

Consequence: the foundation event shape is a staged subset, not a redefinition of Constitution principles 3, 22, 24, or 29.

## D-015 — Versioned world snapshots in a Node-only SQLite repository

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: D-008, D-012

Serialize the complete JSON-safe world through a versioned, integrity-checked snapshot envelope. Store one current snapshot per world in a strict SQLite table through a Node-only repository outside the pure simulation package. Save, load, list, and replacement-save operations use the same validated codec.

Consequence: local desktop persistence is real without coupling domain behavior to SQLite or prematurely normalizing every life-history record. Cross-version migrations, action journals, recovery, and branch storage remain deferred behind the snapshot format boundary.

## D-016 — Separate truth, memory, knowledge, claims, and relationship history

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: D-014

Use separate append-only record families for canonical events, subjective memories, person-specific event knowledge, later claims, and relationship interactions. Rich events preserve typed participants and roles, visibility, tags, location and setting, social pressure, choice, motivation, and immediate reaction. Knowledge records preserve believed content, accuracy, confidence, and direct, told-by, public-record, media, or rumor provenance.

Consequence: memories may differ in strength or interpretation, claims and secondhand beliefs may contradict truth, and relationship summaries remain derivations over explainable episodes. No subjective record silently edits an event.

## D-017 — Typed biography facts and generic historical queries

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Represent factual biography as stable typed records for birth date, birthplace, dated residences, family relationships, education, and occupation. Use generic tags, participants, date/age bounds, geography, facts, and relationship histories for later-system queries rather than adding one-off fields for particular life experiences.

Consequence: a lightweight person can gain compatible detail without losing established history, and later gameplay can ask about residence, past experience, unemployment, affected close contacts, or shared work without parsing prose or special-casing a single event such as marijuana use.

## D-018 — Sparse proposition beliefs and separate political knowledge

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Store a shared stable catalog of policy domains, issues, specific propositions, knowledge subjects, and broad principle definitions. Store only formed per-person records in the append-oriented history: private beliefs, public positions, campaign commitments, principles, and subject knowledge. Keep private belief categorical across position, conviction, salience, and flexibility; treat absence as no formed belief rather than a neutral score. Keep education/occupation-derived expertise, political speech, promises, and historical behavior separate from private belief.

Consequence: the system supports unusual and internally tense political combinations, proposition-specific disagreement within one issue, high expertise with uncertainty, strong low-knowledge beliefs, and thousands of possible propositions without a full vector on every person. Principles, facts, life events, trusted cues, and generated biography do not automatically assign beliefs. Autonomous explainable NPC opinion formation and political-action classification remain deferred.

## D-019 — Authoritative staged roadmap and dependency integration guide

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Maintain `docs/ROADMAP.md` as the authoritative record of completed-stage reconciliation, future sequencing, and long-range integration intent. Maintain `docs/SYSTEM-DEPENDENCIES.md` as the required ownership/reference/API/persistence checklist for new persistent concepts. These documents remain below the Constitution, accepted decisions, architecture, and implemented system contracts; a future roadmap entry is not permission to invent that system's detailed mechanics early.

Consequence: later stages must consume existing stable IDs, append-oriented history, provenance, sparse queries, serialization boundaries, and imperfect-information contracts deliberately. Stage completion is recorded only after implementation, validation, tests, and affected authoritative documents agree.

## D-020 — Separate proposition exposure and perceived formation provenance

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Represent encountering a proposition as its own sparse append-oriented record with source provenance. It does not create a private belief, public statement, or commitment. Belief and principle formation may reference prior biography, exposure, experienced events, memories, event knowledge, claims, relationship interactions, subject knowledge, and categorized trusted cues, but canonical event truth is unavailable as formation context unless the person experienced it or the record cites their prior memory or knowledge.

Consequence: never encountered, encountered without a formed view, and formed belief remain distinct; Stage 4 can later reason from perceived rather than omniscient context; and durable explanations can resolve structured sources without parsing rationale prose or populating blank belief vectors.
