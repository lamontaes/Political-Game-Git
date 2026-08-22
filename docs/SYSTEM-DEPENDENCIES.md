# System Dependency Map

Status: **AUTHORITATIVE INTEGRATION GUIDE**

## Purpose and Authority

This document maps the records, identities, references, APIs, persistence behavior, temporary scaffolding, and expected consumers of the current foundation.

The [Game Constitution](GAME-CONSTITUTION.md) remains higher authority. [Architecture](../ARCHITECTURE.md) and current [system documents](systems/) define implemented behavior. The [Roadmap](ROADMAP.md) defines sequencing, not permission to implement future mechanics early.

## Current Dependency Direction

```text
stable semantic IDs + normalized seed/keyed RNG + simulated dates
  -> World
     |- Jurisdictions
     |- People
     |  `- typed biography facts
     |- shared policy catalog
     `- append-oriented HistoryStore
        |- canonical events
        |- memories
        |- event knowledge/provenance
        |- claims/statements
        |- relationship interactions
        |- proposition exposures
        |- private beliefs
        |- public positions
        |- campaign commitments
        |- principles
        `- subject knowledge/provenance

typed transitions + typed queries
  -> headless demo / React diagnostic viewer

validated World
  -> versioned JSON snapshot
     -> Node-only SQLite repository
```

The simulation owns domain truth and transitions. UI, CLI, and persistence adapters consume the public simulation API; the simulation never imports them.

The `HistoryStore` has one contiguous global sequence, and every record-family array is stored in strictly increasing append-sequence order. Cross-record formation, provenance, source, and supersession references must target an earlier appended record; a same-day reference is invalid when its target has a later sequence. Transition validation and snapshot-load integrity checks reject unknown discriminators and values outside the defined categorical vocabularies instead of accepting structurally plausible but unsupported records.

## Architectural Integration Rule

Before implementing a persistent concept, answer all of the following in its design, tests, and affected documentation:

1. What persistent stable ID will later systems use to reference it?
2. What historical record preserves its creation and changes?
3. What provenance and context will dialogue and decision systems later need?
4. Can game logic query it without parsing human-readable prose?
5. Can it be serialized and integrity-validated?
6. Can it later appear in historical archives and returning-player briefings?
7. Can an NPC reason about it from the NPC's perceived information?
8. Can a player or NPC possess incomplete, disputed, or inaccurate information about it?
9. Can geography affect it where relevant without becoming a global value?
10. Can content expand without adding one field per concept to `Person`?
11. Does the design create a hidden or exposed global score that contradicts the Constitution?

If an answer is intentionally deferred, record the boundary rather than inventing mechanics in the wrong stage.

---

## World

- **Owns:** schema/generator versions, stable world ID, normalized seed, start/current dates, action sequence, ordered jurisdictions and people, shared policy catalog, and the complete `HistoryStore`.
- **Stable IDs exposed:** `World.id`; ordered referenced entity IDs; catalog/history IDs contained by the world.
- **Referenced by:** every world-scoped entity and history-record stable key; snapshot metadata; SQLite primary key.
- **Queries/APIs:** `createWorld`, `assertWorldIntegrity`, `advanceWorld`, `recordWorldEvent`, `materializePerson`, entity selectors, and all world-based query functions.
- **Serialization/persistence:** entire JSON-safe world is validated and stored in snapshot format 3; world schema is 4. Older unsupported versions are rejected because no migration chain exists yet.
- **Temporary scaffolding:** one synthetic demo jurisdiction, one current snapshot per world, and a small authored diagnostic scenario rather than an autonomous world engine. Validated political transitions currently recheck the complete world and shared catalog; future batching or indexes may optimize this without weakening atomic integrity.
- **Future consumers:** every stage, Observer Mode, branch lineage, archives, performance scheduling, and cross-platform saves.

## Stable IDs

- **Owns:** deterministic kind-prefixed FNV-1a hashes of explicit semantic keys through `createStableId`.
- **Stable IDs exposed:** world, jurisdiction, person, fact, event, memory, event-knowledge, claim, relationship, proposition-exposure, policy-definition, political-record, subject-knowledge, and snapshot IDs.
- **Referenced by:** entity maps/order arrays, facts, events, provenance, supersession chains, queries, snapshots, SQLite, and viewer keys.
- **Queries/APIs:** `stableHash` and `createStableId`; integrity checks recompute expected identities.
- **Serialization/persistence:** IDs are plain branded strings and round-trip exactly.
- **Temporary scaffolding:** stable keys are hand-authored/procedural conventions rather than a centralized registry; later schemas must retain kind/key versioning.
- **Future consumers:** organizations, offices, populations, elections, proposals/provisions, institutions, staff roles, archives, and branch lineage.

## Seeded RNG

- **Owns:** normalized seed identity, pinned version-one stream behavior, bounded integer selection, picking, and non-consuming keyed forks.
- **Stable IDs exposed:** none; stable fork keys are deterministic scope identities, not persisted entities.
- **Referenced by:** demo person generation, materialization, and demo occurrence selection.
- **Queries/APIs:** `normalizeSeed`, `SeededRng`, and `pickDistinct`.
- **Serialization/persistence:** the normalized world seed and generator versions are stored; transient RNG state is not. Reproducible streams are derived from stable action/person keys.
- **Temporary scaffolding:** a small pinned generator, not yet a scheduling framework for multi-resolution systems.
- **Future consumers:** autonomous decisions, event selection, electorate sampling, polling, elections, and long-run simulation. New consumers should use isolated keyed scopes so unrelated detail expansion cannot perturb their streams.

## Simulated Time

- **Owns:** validated ISO date-only values and monotonic explicit advancement.
- **Stable IDs exposed:** no independent time entity; committed advancement receives a stable event ID.
- **Referenced by:** facts, events, memories, knowledge, claims, relationships, political records, snapshots, and queries.
- **Queries/APIs:** `makeIsoDate`, `addDays`, `ageOnDate`, `dateAtAge`, `advanceWorld`.
- **Serialization/persistence:** start/current dates and every record date round-trip; no wall-clock dependency.
- **Temporary scaffolding:** positive-day advancement and one audit event; schedules, attention, weekly play, and multi-resolution processing are deferred.
- **Future consumers:** Life Mode, event chains, campaigns, institutions, terms, careers, legislation, staff workload, and archives.

## Jurisdiction

- **Owns:** stable jurisdiction identity, slug/name/kind/parent label, and source/as-of/status provenance.
- **Stable IDs exposed:** `Jurisdiction.id`.
- **Referenced by:** people, biography facts, event location/jurisdiction, data snapshots, and future geographic systems.
- **Queries/APIs:** ordered world lookup, `resolveEntityLabel`, geography filters such as `hasLivedInJurisdiction` and `queryEvents`.
- **Serialization/persistence:** embedded in world snapshots and validated for order, identity, references, and provenance status.
- **Temporary scaffolding:** Lexington-Fayette is explicitly synthetic; parent geography is currently text rather than a full stable jurisdiction hierarchy.
- **Future consumers:** institutions, sourced data, geographic reputation, populations, elections, coalitions, offices, laws, and maps.

## Person

- **Owns:** stable identity, generation key, name, birth date, home jurisdiction, detail level, established facts, and optional stored materialized facts.
- **Stable IDs exposed:** `Person.id`; person fact IDs.
- **Referenced by:** events and participants, family facts, memories, knowledge, claims, relationship interactions, proposition exposures, political records, future staff/careers/elections, and UI selection.
- **Queries/APIs:** `personName`, `factsForPerson`, `createLightweightPerson`, `materializePerson`, person/history selectors.
- **Serialization/persistence:** complete person records and detail generator version round-trip in the world snapshot.
- **Temporary scaffolding:** generated names and biographies are synthetic; there is no final personality, goals, perception, family simulation, career engine, death, or reputation system.
- **Future consumers:** all character, life, NPC, staff, campaign, governing, family, archive, and control-transfer systems.

## Biography Facts

- **Owns:** typed stable factual records for birth date, birthplace, residence, family relationship, education, and occupation, with dates, summaries, jurisdiction where relevant, and provenance.
- **Stable IDs exposed:** fact IDs derived from person ID and semantic fact key.
- **Referenced by:** materialization constraints, belief/principle formation context, subject-knowledge provenance, biography and work queries, timelines, and future careers/dialogue.
- **Queries/APIs:** `appendPersonFact`, `factsForPerson`, `factsNewestFirst`, residence/work queries, and subject-knowledge profiles.
- **Serialization/persistence:** stored under people and validated against chronology, references, cardinality, provenance, and stable identity.
- **Temporary scaffolding:** employer and institution are text. Equal employer text is not durable organization identity and can currently create an overly broad coworker fallback; Stage 5 should introduce stable organization/location references and revise that inference.
- **Future consumers:** careers, organizations, expertise, eligibility, dialogue, reputation, family, staff history, and archives.

## Progressive Materialization

- **Owns:** deterministic expansion from lightweight to materialized detail; it owns no separate historical occurrence.
- **Stable IDs exposed:** preserves the same person ID and creates stable fact IDs for generated facts.
- **Referenced by:** person inspection and future selective-activation systems.
- **Queries/APIs:** `materializePerson` and `materializePersonRecord`.
- **Serialization/persistence:** generated facts and materializer version are stored; repeated materialization is an idempotent no-op.
- **Temporary scaffolding:** currently adds only synthetic education/occupation facts and resolves subject links through catalog-defined materialization tags.
- **Future consumers:** large populations, rising minor NPCs, staff/candidates, event detail, Observer Mode, and performance scaling.

Materialization is a simulation-detail operation, not an in-world event. A lightweight person already existed before expansion. Its keyed RNG stream must remain isolated from unrelated future behavior.

## Canonical Historical Events

- **Owns:** historical truth for committed occurrences: semantic key, stable ID, global sequence, occurrence/recording dates, type, jurisdiction/location, involved entities, participants/roles, visibility, tags, summary, structured context, and person-fact constraints.
- **Stable IDs exposed:** `HistoricalEvent.id`.
- **Referenced by:** person history, memories, event knowledge, claims, relationship interactions, fact provenance, belief formation, subject-knowledge provenance, and future actions/archives.
- **Queries/APIs:** `recordWorldEvent`, `eventsInvolving`, `eventsNewestFirst`, `queryEvents`, and typed tag/age/geography experience queries.
- **Serialization/persistence:** stored in append-sequence order within the contiguous history and validated for identity, chronology, earlier-sequence references, participants, categorical values, context, and uniqueness.
- **Temporary scaffolding:** committed records exist, but prerequisites, blockers, conditional chains, causal propagation, corrections, and an autonomous event engine are deferred.
- **Future consumers:** dialogue, NPC decisions, opposition research, reputation, events, campaigns, governing, staff knowledge, archives, and briefings.

## Memories

- **Owns:** a person's subjective remembered summary, interpretation, strength, relevance tags, formation date, event reference, and explicit supersession.
- **Stable IDs exposed:** `MemoryRecord.id`.
- **Referenced by:** person memory queries and future decisions/dialogue/relationships.
- **Queries/APIs:** `recordMemory` and `memoriesForPerson`.
- **Serialization/persistence:** append-oriented history records validated against person/event identity, chronology, and compatible supersession. A memory requires direct involvement in the event or prior person-specific event knowledge, and a superseding memory cannot backdate its predecessor.
- **Temporary scaffolding:** no autonomous recall, forgetting, distortion engine, salience updates, or behavioral consequences.
- **Future consumers:** Stage 4 decisions, Stage 9 dialogue, Stage 10 political memory, Stage 11 continuity, and Stage 12 briefings.

## Event Knowledge and Provenance

- **Owns:** what one person believes about one event, learned date, accuracy classification, confidence, and source: direct, told-by, public record, media, or rumor.
- **Stable IDs exposed:** `EventKnowledgeRecord.id` plus referenced person/event/claim IDs.
- **Referenced by:** known-by diagnostics and future imperfect-information reasoning.
- **Queries/APIs:** `recordEventKnowledge` and `knowledgeForEvent`.
- **Serialization/persistence:** append-oriented, with source/reference/chronology integrity checks. Direct knowledge requires event involvement; told-by knowledge requires a different source person and any referenced claim must already exist earlier in the global append sequence.
- **Temporary scaffolding:** accuracy is diagnostic truth metadata; there is no automatic dissemination, correction, source-trust model, or player-facing knowledge filter.
- **Future consumers:** NPC perceptions, rumors/media, staff reports, opposition research, dialogue, relationships, archives, and fog-of-information UI.

## Claims and Statements

- **Owns:** a real act of speech about an event: speaker, event, date, audience, statement, truth relationship, and direct/reported/public/media provenance.
- **Stable IDs exposed:** `ClaimRecord.id`.
- **Referenced by:** told-by knowledge provenance and event diagnostics.
- **Queries/APIs:** `recordClaim` and `claimsForEvent`.
- **Serialization/persistence:** append-oriented and validated without mutating the source event. Reported-by provenance must identify someone other than the speaker.
- **Temporary scaffolding:** no general dialogue-act taxonomy, quotation correction chain, speech-generation system, or reputational consequence engine.
- **Future consumers:** dialogue, media, campaigns, governing, reputation, fact-checking, knowledge propagation, and archives.

## Relationship Histories

- **Owns:** dated interactions between a canonical pair of people, with type, change, significance, summary, tags, and optional source event.
- **Stable IDs exposed:** `RelationshipInteraction.id` and referenced person/event IDs.
- **Referenced by:** pair histories, work/affected-contact queries, and future character reasoning.
- **Queries/APIs:** `recordRelationshipInteraction`, `relationshipHistory`, `didPeoplePreviouslyWorkTogether`, `deriveRelationshipSummary`, and `hasCloseRelationshipWithPersonAffectedByEvent`.
- **Serialization/persistence:** append-oriented and validated for two distinct canonical people, chronology, and compatible event references.
- **Temporary scaffolding:** `deriveRelationshipSummary` uses a coarse hidden calculation solely as an interim contextual helper. It is not authoritative relationship state, cannot replace specific episodes, and is not exposed as a meter. Asymmetric trust, obligation, loyalty, third-party effects, and autonomous behavior are deferred.
- **Future consumers:** Stage 4 decisions, careers, campaigns, legislation, staff, families, reputation, and archives.

## Policy Catalog

- **Owns:** shared stable domain, issue, proposition, knowledge-subject, and principle definitions plus deterministic order arrays and catalog version.
- **Stable IDs exposed:** policy-domain, policy-issue, proposition, subject, and principle-definition IDs.
- **Referenced by:** sparse beliefs, public positions, commitments, principles, education/occupation subjects, knowledge records, and political queries.
- **Queries/APIs:** definition factories, `createPolicyCatalog`, `assertPolicyCatalogIntegrity`, `clonePolicyCatalog`, and catalog lookups.
- **Serialization/persistence:** stored once per world and integrity-validated for identity, hierarchy, scope references, parameters, tags, and ordering.
- **Temporary scaffolding:** a small synthetic catalog used to prove architecture, not a production issue library or legislation/provision model.
- **Future consumers:** NPC decisions, populations, campaigns, dialogue, legislation mapping, media, advisers, and archives.

## Proposition Exposure

- **Owns:** sparse historical evidence that a person encountered one specific proposition at a date, with a summary and direct-experience, told-by, public-record, media, organization, or authored provenance.
- **Stable IDs exposed:** `PropositionExposureRecord.id` plus person, proposition, and source event/person/claim references where applicable.
- **Referenced by:** formation context, opinion-state queries, the developer viewer, and future perception/opinion reasoning.
- **Queries/APIs:** validated `recordPropositionExposure`, exposure history, encountered-state, and proposition opinion-state queries.
- **Serialization/persistence:** part of the contiguous append-oriented history and complete world snapshot; references and chronology are integrity-validated. Told-by provenance requires another person, and any event or claim source must have an earlier global sequence even on the same simulated date.
- **Temporary scaffolding:** exposure is explicitly recorded rather than automatically propagated. No attention, media reach, persuasion, or opinion-formation engine exists.
- **Future consumers:** Stage 4 perceived reasoning, Stage 8 opinion formation, Stage 9 messaging/media, dialogue, advisers, and archives.

Exposure does not imply a private belief, public statement, campaign commitment, subject expertise, or agreement with the source.

## Political Belief, Speech, Commitment, and Principle Histories

- **Owns:** sparse append-only `PrivateBeliefRecord`, `PublicPositionRecord`, `CampaignCommitmentRecord`, and `PrincipleRecord` histories. Private beliefs separate position, conviction, salience, flexibility, rationale, formation reason/context, and supersession.
- **Stable IDs exposed:** belief, public-position, commitment, and principle-record IDs plus proposition/principle/person and structured formation-source references.
- **Referenced by:** current/history queries and future decision, campaign, dialogue, electorate, legislation, adviser, and archive systems.
- **Queries/APIs:** validated record transitions; private/public/commitment/principle history and latest-state queries; typed private state and dated changes; sparse domain coverage; resolved formation-source lookup.
- **Serialization/persistence:** share the contiguous history sequence and are validated for chronology, catalog/person references, categorical values, perceived source context, earlier-sequence formation references, and linear supersession. Same-day formation context cannot point forward to a record appended later, and a person-valued trusted cue must identify someone other than the person forming the view. A public-position or campaign-commitment source event must already exist, involve the person, and share the record's effective date.
- **Temporary scaffolding:** records are explicitly authored diagnostic fixtures. There is no autonomous opinion engine, party normalization, behavior comparison, moral judgment, or dense per-person issue vector.
- **Future consumers:** Stages 4, 8, 9, 10, 11, and 12.

Private belief, public position, campaign commitment, and historical behavior remain separate. Principles may conflict and do not automatically synthesize proposition positions.

## Subject Knowledge, Expertise, and Practical Experience

- **Owns:** sparse subject-knowledge history with familiarity, understanding, expertise, practical experience, provenance, and supersession. Supporting education/occupation facts provide a derived fallback; when a latest explicit assessment exists, it is authoritative and can revise an earlier level.
- **Stable IDs exposed:** subject-knowledge record IDs, knowledge-subject IDs, and referenced fact/event/source-person IDs.
- **Referenced by:** political formation provenance, knowledge-profile queries, the diagnostic viewer, and future choices, dialogue, careers, advisers, staff, and institutions.
- **Queries/APIs:** `recordSubjectKnowledge`, knowledge history/latest/profile/domain queries, and `hasPracticalExperienceForSubject`.
- **Serialization/persistence:** explicit records are in the contiguous history sequence; subjects on education/occupation facts and all provenance references are validated and persisted. Historical-event and other history-source references must already exist earlier in append sequence, and trusted-report provenance must identify another person.
- **Temporary scaffolding:** categorical derivation is a first foundation, not skill decay, pedagogy, credentials, task simulation, or correctness. Biography does not generate ideology.
- **Future consumers:** Stages 4–6, 9–12, specialized dialogue, staff assignments, and historical dossiers.

## History Queries

- **Owns:** no authoritative data; pure typed projections over world records.
- **Stable IDs exposed:** returns source records and their stable IDs rather than copied prose-derived identities.
- **Referenced by:** tests, demo, viewer, and future domain systems.
- **Queries/APIs:** event filters, residence/experience/age/geography, relationship/work, memories/knowledge/claims, political histories/current state/domain coverage, and sparse person-subject profiles/practical experience. Mixed political encounter evidence is ordered by effective date with append sequence as a same-day tie-breaker, so backfilled older records do not become current merely because they were appended later.
- **Serialization/persistence:** derived results are not stored; authoritative source records are.
- **Temporary scaffolding:** many histories use linear scans and the coworker query retains a text-employer fallback. Belief-domain and person-subject profile queries already walk sparse person records; future indexes may optimize other lookups without becoming competing truth.
- **Future consumers:** dialogue conditions, NPC option evaluation, advisers, UI, archives, campaign/legislative systems, and simulation auditing.

## Serialization

- **Owns:** snapshot envelope format, content-derived snapshot ID, metadata, JSON encoding/decoding, version rejection, and full world integrity validation.
- **Stable IDs exposed:** snapshot ID and world ID.
- **Referenced by:** SQLite repository, CLI/demo result, and future save adapters.
- **Queries/APIs:** `createWorldSnapshot`, `serializeWorld`, and `deserializeWorld`.
- **Serialization/persistence:** snapshot format 3 contains world schema 4 and the complete graph; load returns a defensive clone after validating per-family append order, the contiguous global sequence, cross-record chronology and sequence direction, union discriminators, and categorical values.
- **Temporary scaffolding:** no migrations, action journal, compression, recovery, parent/branch lineage, or compatibility promise for older formats.
- **Future consumers:** desktop saves, autosave/recovery, Observer Mode, branches, archive export, debugging, and cross-platform packaging.

## SQLite Persistence

- **Owns:** Node-only durable storage of one current validated snapshot per world in a strict `world_snapshots` table.
- **Stable IDs exposed:** world and snapshot IDs in stored summaries.
- **Referenced by:** future desktop/runtime adapters; never by the pure simulation or browser viewer.
- **Queries/APIs:** `save`, `load`, `list`, and `close` on `SqliteWorldRepository`.
- **Serialization/persistence:** stores the canonical snapshot payload and replaces the row for the same world ID transactionally through SQLite's upsert behavior.
- **Temporary scaffolding:** one snapshot per world, schema creation in the repository constructor, no migrations, branches, action log, backups, recovery, concurrency policy, or production save picker.
- **Future consumers:** local desktop saves, autosave, branches, Observer Mode, long-run auditing, and packaging.

## Headless Demo and CLI

- **Owns:** synthetic deterministic fixtures and an ordered replay scenario; it owns no production world rules.
- **Stable IDs exposed:** reports world, snapshot, and materialized-person IDs.
- **Referenced by:** validation and developers.
- **Queries/APIs:** `createDemoWorld`, `advanceDemoWorld`, `runDemoScenario`, and the CLI entry point.
- **Serialization/persistence:** creates validated snapshots but does not write SQLite by default.
- **Temporary scaffolding:** synthetic people/events/political records and one community-listening occurrence.
- **Future consumers:** regression tests, profiling, long-simulation harnesses, and Observer Mode audits.

## Developer Viewer

- **Owns:** only ephemeral UI selection, pending seed input, and status text. It does not own simulation truth.
- **Stable IDs exposed:** displays and uses world/person/event/catalog/history IDs as React keys and references.
- **Referenced by:** developers inspecting the current foundation.
- **Queries/APIs:** public simulation creation, advancement, materialization, and read-only query APIs.
- **Serialization/persistence:** browser viewer state is intentionally in-memory and stateless; it does not use SQLite, browser storage, or Sites D1.
- **Temporary scaffolding:** diagnostic omniscience, foundation styling, synthetic content, and no player-facing information-access rules.
- **Future consumers:** replaced or reorganized by Stage 6.5's real game shell while retaining reusable typed projections and accessibility invariants.

The viewer may display diagnostic truth only when clearly understood as developer tooling. It must not normalize raw ideology, personality, relationship, persuasion, political-capital, or true-support numbers into player-facing meters.

---

## Important Future Connection Points

- **Stage 4 decisions:** consume perceived facts, memories, event knowledge, relationship episodes, sparse political records, subject expertise, incentives, and keyed RNG; emit explainable choice/history records.
- **Stage 5 careers/organizations:** replace textual employer identity with stable organization/location references and create dated employment/activity history.
- **Stage 6 events:** consume explicit conditions and emit canonical events plus scoped consequence records; definitions remain separate from committed history.
- **Stage 7 geography/institutions:** extend stable jurisdiction hierarchy and sourced/effective-dated definitions without changing generic simulation assumptions.
- **Stage 8 populations:** reference propositions, geography, cues, and public records sparsely; never materialize every voter or every issue.
- **Stage 9 campaigns:** create persistent contest/candidate/staff/message/poll identities and historical records rather than generic points.
- **Stage 10 legislation:** define stable proposal, revision, provision, amendment, procedure, and action IDs; map political beliefs to specific propositions/provisions without conflating them.
- **Stage 11 staff:** use the same `Person` and history/knowledge/relationship systems, adding stable roles, assignments, reports, and delegation records.
- **Stage 12 archives/branches:** index existing records; add branch lineage without mutating the parent world or duplicating contradictory truth stores.
