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
     |- shared mind catalog
     |- observer / controlled-person state
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
        |- subject knowledge/provenance
        |- personality tendencies
        |- personal values
        |- goal states
        |- appraisals
        |- explicit perceptions
        |- temporary states
        |- durable decision traces
        |- organizations / effective-dated profiles
        |- work relationships / statuses / roles
        |- education enrollments / states
        |- organization participations / states
        |- households / locations / memberships
        |- kinship / partnerships / care / child authority
        |- life commitments / load resolutions
        |- exact resource positions / flows / terms / outcomes
        |- obligations / states
        `- dwellings / occupancies / tenures / states

typed transitions + historical/resource/housing/relationship queries
  -> subjective-perception projection
     -> pure general decision evaluation
        -> NPC political-belief adapter/application

validated projections and transitions
  -> headless demo / React diagnostic viewer

validated World
  -> versioned JSON snapshot
     -> Node-only SQLite repository
```

The simulation owns domain truth and transitions. UI, CLI, and persistence adapters consume the public simulation API; the simulation never imports them.

The `HistoryStore` has one contiguous global sequence, and every record-family array is stored in strictly increasing append-sequence order. Cross-record formation, provenance, source, and supersession references must target an earlier appended record; a same-day reference is invalid when its target has a later sequence. Transition validation and snapshot-load integrity checks reject unknown discriminators and values outside the defined categorical vocabularies instead of accepting structurally plausible but unsupported records.

## Approved Future Dependency Spine

The long-term dependency direction is reserved as follows. The chain through the general decision engine and completed Stage 5 life/household/organization/resource foundation is implemented; later items are architectural contracts, not claims of implementation:

```text
WORLD / IDS / TIME
        ↓
FACTUAL HISTORY
        ↓
MEMORY / KNOWLEDGE / CLAIMS / RELATIONSHIPS
        ↓
BELIEFS / PRINCIPLES / EXPERTISE
        ↓
PERSONALITY / VALUES / GOALS / APPRAISAL
        ↓
SUBJECTIVE PERCEPTION
        ↓
GENERAL DECISION ENGINE
        ↓
LIFE / HOUSEHOLDS / ORGANIZATIONS / PERSONAL RESOURCES / HOUSING
        ↓
WORLD STATE / ECONOMY / POLICY EFFECTS / EVENTS
        ↓
MUTABLE LAW / INSTITUTIONS / AUTHORITY
        ↓
REAL CIVIC DATA
        ↓
POPULATION / PUBLIC OPINION
        ↓
PARTIES / CAMPAIGNS / ELECTIONS
        ↓
GOVERNING / FISCAL / LEGISLATIVE SYSTEMS
        ↓
STAFF / APPOINTMENTS / ADMINISTRATION
        ↓
COURTS / NATIONAL / INTERNATIONAL EXPANSION
        ↓
LONG-RUN HISTORY / ARCHIVE / OBSERVER
```

Later systems consume the stable identities, dated histories, perceived-information boundaries, and typed queries above them. They do not replace those records with presentation text or parallel truth stores.

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
12. If law can change the concept, does the system resolve the controlling rule effective at the queried simulated date?
13. If resources move, does the design use compatible flow concepts without forcing one universal field onto unrelated records?
14. Can progressive promotion add resolution without changing identity, existence, or established history?
15. Does sourced civic data preserve official-source and historical-version provenance needed for inspect/explain/open-source workflows?
16. If a decision is evaluated, is its diagnostic trace distinct from the canonical action or event that results?

If an answer is intentionally deferred, record the boundary rather than inventing mechanics in the wrong stage.

---

## World

- **Owns:** schema/generator versions, stable world ID, normalized seed, start/current dates, action sequence, ordered jurisdictions and people, shared policy, mind, world-metric, and causal-mechanism catalogs, observer/controlled-person state, and the complete `HistoryStore`.
- **Stable IDs exposed:** `World.id`; ordered referenced entity IDs; catalog/history IDs contained by the world.
- **Referenced by:** every world-scoped entity and history-record stable key; snapshot metadata; SQLite primary key.
- **Queries/APIs:** `createWorld`, `assertWorldIntegrity`, `advanceWorld`, `recordWorldEvent`, `materializePerson`, entity selectors, and all world-based query functions.
- **Serialization/persistence:** the entire JSON-safe world is validated and stored in snapshot format 11; world schema is 12. Older unsupported versions are rejected because no migration chain exists yet.
- **Temporary scaffolding:** one synthetic demo jurisdiction, one current snapshot per world, and a small authored diagnostic scenario rather than an autonomous world engine. Validated political transitions currently recheck the complete world and shared catalog; future batching or indexes may optimize this without weakening atomic integrity.
- **Future consumers:** every stage, Observer Mode, branch lineage, archives, performance scheduling, and cross-platform saves.

## Stable IDs

- **Owns:** deterministic kind-prefixed FNV-1a hashes of explicit semantic keys through `createStableId`.
- **Stable IDs exposed:** world, jurisdiction, person, fact, event, memory, event-knowledge, claim, relationship, proposition-exposure, policy/mind/metric-definition, metric-state/observation, causal-mechanism-definition, causal-process, effect-activation, policy-alternative/baseline/operation/implementation-profile/estimate/realization, future-due-item/state, political-record, subject-knowledge, personality, value, goal, appraisal, perception, decision/trace, temporary-state, organization/profile, work/status/role, education/state, participation/state, household/location/membership, kinship, partnership, care, child-authority/state, life-commitment/load-resolution, resource-position/flow/terms/outcome/obligation/state, dwelling/occupancy/state/tenure/state, and snapshot IDs.
- **Referenced by:** entity maps/order arrays, facts, events, provenance, supersession chains, queries, snapshots, SQLite, and viewer keys.
- **Queries/APIs:** `stableHash` and `createStableId`; integrity checks recompute expected identities.
- **Serialization/persistence:** IDs are plain branded strings and round-trip exactly.
- **Temporary scaffolding:** stable keys are hand-authored/procedural conventions rather than a centralized registry; later schemas must retain kind/key versioning.
- **Future consumers:** organizations, offices, populations, elections, proposals/provisions, institutions, staff roles, archives, and branch lineage.

## Seeded RNG

- **Owns:** normalized seed identity, pinned version-one stream behavior, bounded integer selection, picking, and non-consuming keyed forks.
- **Stable IDs exposed:** none; stable fork keys are deterministic scope identities, not persisted entities.
- **Referenced by:** demo person generation, materialization, demo occurrence selection, and option-keyed bounded decision variation.
- **Queries/APIs:** `normalizeSeed`, `SeededRng`, and `pickDistinct`.
- **Serialization/persistence:** the normalized world seed and generator versions are stored; transient RNG state is not. Reproducible streams are derived from stable action/person keys.
- **Temporary scaffolding:** a small pinned generator, not yet a scheduling framework for multi-resolution systems.
- **Future consumers:** event selection, electorate sampling, polling, elections, and long-run simulation. New consumers follow the Stage 4 decision evaluator's isolated keyed-scope pattern so unrelated detail expansion cannot perturb their streams.

## Simulated Time

- **Owns:** validated ISO date-only values and monotonic explicit advancement.
- **Stable IDs exposed:** no independent time entity; committed advancement receives a stable event ID.
- **Referenced by:** facts, events, memories, knowledge, claims, relationships, political, mind, and life records, decision/life cutoffs, snapshots, and queries.
- **Queries/APIs:** `makeIsoDate`, `addDays`, exact `daysBetween`, `ageOnDate`, `dateAtAge`, and the one authoritative `advanceWorld` path with optional injected future-transition handlers.
- **Serialization/persistence:** start/current dates and every record date round-trip; no wall-clock dependency.
- **Temporary scaffolding:** positive-day advancement, one audit event, and Stage 6 Run A due-item dispatch; Stage 5 records time-demand ranges and resolves an explicitly requested completed week. Hourly schedules, recurrence/payroll/billing, automatic decisions, player weekly mode, and multi-resolution processing are deferred.
- **Future consumers:** Life Mode, event chains, campaigns, institutions, terms, careers, legislation, staff workload, and archives.

## Exact Quantities and World Metric Catalog

- **Owns:** canonical reduced safe-integer rational non-money quantities with validated open namespaced units; exact compatible comparison/addition/subtraction/division and share scaling with overflow rejection; a closed quantity-or-money metric-value union; stable metric definitions with open domain/tags, stock/flow/rate/index nature, point/interval period requirement, optional denominator reference, explicit aggregation limits, and primitive-versus-derived state semantics.
- **Stable IDs exposed:** `WorldMetricDefinition.id`; quantity units and metric/segment keys are validated semantic keys rather than entities.
- **Referenced by:** canonical metric-state records, observation vintages/uncertainty, historical metric queries, current Run B effects/derivations, Run C baselines, Run D event conditions, Stage 7 institutions, Stage 8 populations, Stage 10 fiscal systems, and archives/UI.
- **Queries/APIs:** exact quantity creation/normalization, comparison and compatible addition/subtraction; metric definition/catalog creation, cloning, and integrity.
- **Serialization/persistence:** metric catalog version `world-metric-catalog-v2` and exact integer numerator/denominator/unit fields live in world schema 12/snapshot 11 and round-trip without floating precision loss.
- **Temporary scaffolding:** a deliberately small synthetic catalog proves point/interval, stock/flow/rate/index, quantity/money, aggregate economy/fiscal, and primitive/derived semantics. There is no production dataset, formula language, automatic dynamics, or automatic geographic aggregation.
- **Future consumers:** Stage 6 Runs C–E and later law, opinion, campaign, governing/fiscal, briefing, and archive systems.

## Canonical Metric State and Observation Vintages

- **Owns:** jurisdiction plus optional open-segment metric scope; explicit point/interval reference periods; append-oriented canonical truth with explicit same-key correction; separate source-series observations with release/recording dates, vintage/revision identity, optional underlying truth link, structured citation/methodology, and exact compatible range/MOE uncertainty.
- **Stable IDs exposed:** `WorldMetricStateRecord.id` and `WorldMetricObservationRecord.id` plus referenced metric, jurisdiction, prior vintage/correction, source, and optional canonical-state IDs.
- **Referenced by:** metric queries, explicit release events, later knowledge/media adapters, Run B causal effects/dynamics, Run C baselines, Run D event prerequisites, Stage 8 polling/opinion inputs where semantically appropriate, Stage 10 fiscal analysis, and archives.
- **Queries/APIs:** canonical exact-period state, reference-period-ordered most recent state, complete state history, source-specific observation history/vintages/latest, and all-series availability at a date-plus-exclusive-sequence cutoff.
- **Serialization/persistence:** both families join the one global sequence. Integrity rejects type/unit/currency/period mismatch, missing jurisdictions, future chronology, implicit duplicates, cross-scope correction/revision, incompatible uncertainty, forward underlying-state/provenance references, and malformed loaded chains.
- **Temporary scaffolding:** records are explicitly authored/simulated. Missing jurisdictions/segments return no result rather than zero; state never fabricates observation; observation never mutates state; neither creates person knowledge.
- **Current/future consumers:** an explicit ordinary release event plus `EventKnowledgeRecord` proves bounded subjective access now. Later forecasting, data release, media, public opinion, policy, fiscal, and UI adapters consume the same records.

## Causal Processes and Effect Activations

- **Owns:** stable append-oriented causal provenance with effective/recorded dates, canonical sources, earlier causal parents, acyclic ancestry, and distinct-root recovery; a stable mechanism-definition catalog with exact linear/bounded response curves; committed cause-to-metric activations with typed magnitude/direction and a durable point-target or exact interval-total basis, scope, onset/ramp/maturity/end, optional compatible threshold/bound, realization, and source history.
- **Stable IDs exposed:** `CausalMechanismDefinition.id`, `CausalProcessRecord.id`, and `EffectActivationRecord.id` plus target metric/scope, source, parent, and causal references.
- **Referenced by:** explicit aggregate metric evaluation and current Run C policy operations/baselines; future Run D incidents/chains, Run E evidence where authorized, Stage 4/8/10 reasoning and analysis, and archives.
- **Queries/APIs:** definition/catalog construction and integrity; causal-process recording; effect activation; date-plus-exclusive-sequence process/effect queries; distinct root-cause deduplication; exact target-period phase contribution; explicit aggregate evaluation that filters incompatible interval bases; and deliberate canonical result recording through `recordWorldMetricState`.
- **Serialization/persistence:** the causal catalog and two record families live in world schema 12/snapshot 11, join the one contiguous append sequence, preserve durable magnitude bases, and round-trip exactly through JSON and Node-only SQLite.
- **Temporary scaffolding:** only linear and bounded ease-out curves exist. Point phases use the target point; interval phases use a documented representative midpoint and require exact stored-interval equality, not inferred cadence conversion. Activation never mutates a target automatically. There is no equation DSL, serialized callback, causal-strength score, graph database, policy identity, incident identity, recurrence, or event duplicate.
- **Current/future consumers:** Run B aggregate economy is the first consumer. Run C and Run D must reuse these identities/evaluators rather than create policy-specific or incident-specific effect stores.

## Lightweight Aggregate Economy and Fiscal Derivations

- **Owns:** a small stable metric vocabulary for resident/labor/employed counts, income/cost, consumption/output/housing proxies, and revenue/outlays/debt; exact source-preserving labor, purchasing-power, and fiscal-balance queries; and an explicit baseline-plus-effects evaluation path.
- **Stable IDs exposed:** primitive canonical values remain `WorldMetricStateRecord` IDs. Derived results expose the exact source-state IDs they used but are not independent entities or mutable truth.
- **Referenced by:** current causal effects and later policy, incident, opinion, governing/fiscal, archive, and briefing consumers.
- **Queries/APIs:** coherent unemployment count/rate; nominal-income/cost purchasing power; revenue-minus-outlays balance from matching scope/period/currency; aggregate effect evaluation and canonical result recording.
- **Serialization/persistence:** primitive metric state and any explicitly evaluated canonical result use existing metric history. Derived query objects are ephemeral deterministic projections. The expanded catalog persists as `world-metric-catalog-v2`.
- **Temporary scaffolding:** aggregate proxies are explicit authored/simulated period records; advancing time writes no economy tick. There are no firms, goods, markets, resident/business agents, government accounts, appropriations, tax law, debt instruments, central bank, organization accounting, or full national accounts.
- **Current/future consumers:** Run C policy realization contributes effects explicitly; Stage 10 later supplies authoritative political budget/tax/appropriation producers. Stage 5 personal/household resources remain separate authoritative concrete money history.

## Quantitative Policy Alternatives, Baselines, and Realization

- **Owns:** stable generic proposal/intervention identity; immutable closed typed exact operation semantics; one-metric/jurisdiction/optional-segment/period targeting; dated source-bearing counterfactual baseline revisions; estimate revisions with shared projected causal root; five separate exact implementation factors; and explicit blocked/not-triggered/partial/full realization links to ordinary Run B effects.
- **Stable IDs exposed:** `PolicyAlternativeRecord.id`, `PolicyBaselineRecord.id`, `PolicyOperationRecord.id`, `PolicyImplementationProfileRecord.id`, `PolicyEstimateRecord.id`, and `PolicyRealizationRecord.id` plus baseline, predecessor, metric, scope, operation, causal, effect, and provenance references.
- **Referenced by:** explicit policy analysis/knowledge events and the Stage 4 decision adapter now; later campaign proposals, legislation, executive/administrative choices, institutions, governing implementation, fiscal analysis, incidents, archives, and briefings.
- **Queries/APIs:** append-only writers for all six families; exact baseline-versus-alternative evaluation; latest/id baseline and estimate queries at date-plus-exclusive-sequence cutoff; implementation-share/status derivation; explicit or due-item realization; per-person analysis knowledge; and actor-specific decision-context adaptation.
- **Serialization/persistence:** all families join the one global sequence in world schema 12/snapshot 11 and round-trip exactly through JSON and Node-only SQLite. Integrity rejects malformed open keys/closed discriminators, duplicate IDs, unavailable sources, unit/currency/scope/period mismatch, invalid revision/timing/factors, forecast-effect conflation, and mismatched actual causal/effect links.
- **Temporary scaffolding:** authority, resources, capacity, compliance, and uptake are injected exact evidence because Stage 7 and governing institutions do not exist. Baselines are explicitly authored/simulated and no automatic forecasting service exists. The multiplicative five-factor rule is the sole aggregate; there is no equation language, opinion score, policy tick, or policy-specific effect store.
- **Current/future consumers:** Run C is the first policy consumer of Run A/B metrics, time, causes, and effects. Run D incidents reuse the same causal substrate. Stage 7/later governing systems may author authoritative alternatives, authority evidence, and realization without replacing these records.

## Future Due Items and Authoritative Time Dispatch

- **Owns:** one stable future due identity, due date, open transition key, sorted canonical domain references, optional jurisdiction/provenance, append-oriented closed scheduled/resolved/cancelled/blocked state, and nonserialized deterministic handler registry integrated with `advanceWorld`. A due-today scheduled item is valid pending work; a strictly overdue scheduled item is invalid.
- **Stable IDs exposed:** `FutureDueItem.id`, `FutureDueItemStateRecord.id`, referenced canonical entity IDs, and optional ordinary outcome-event ID.
- **Referenced by:** authoritative time advancement now; later terms, elections, policy effective dates/sunsets/phases, deadlines, court stays, appointments, and incident follow-ons.
- **Queries/APIs:** schedule, explicit terminal cancellation, cutoff-aware state lookup, due-range ordering, registry construction, and internal deterministic resolution through `advanceWorld`. Due-range resolution includes pending items on the starting current date.
- **Serialization/persistence:** identity/state share global sequence and exact snapshots. Integrity rejects past scheduling, missing/unavailable references, malformed keys, skipped strictly overdue scheduled items, invalid lifecycle/supersession, wrong-date resolved/blocked state, and invalid outcome-event chronology; due-today scheduled work remains loadable pending the next advance.
- **Temporary scaffolding:** only synthetic/test handlers exist. Items contain no closure, executable/formula/recurrence string, arbitrary payload, or duplicate domain truth. Handlers can compose normal validating canonical writers and append later scheduled follow-ons, but cannot rewrite existing due history. A missing or failing handler aborts an advance atomically; terminal items do not rerun.
- **Future consumers:** Stage 6 Runs D–E, Stage 7 institutions/law/elections, Stage 10 implementation/governing, Stage 11 appointments, and archives. Run C uses one named realization handler and adds no scheduled recurrence.

## Jurisdiction

- **Owns:** stable jurisdiction identity, slug/name/kind/parent label, and source/as-of/status provenance.
- **Stable IDs exposed:** `Jurisdiction.id`.
- **Referenced by:** people, biography facts, event location/jurisdiction, organization/work/household/life records, eligibility requests, data snapshots, and future geographic systems.
- **Queries/APIs:** ordered world lookup, `resolveEntityLabel`, geography filters such as `hasLivedInJurisdiction` and `queryEvents`.
- **Serialization/persistence:** embedded in world snapshots and validated for order, identity, references, and provenance status.
- **Temporary scaffolding:** Lexington-Fayette is explicitly synthetic; parent geography is currently text rather than a full stable jurisdiction hierarchy. `kind` remains open, and no 50-state validation or uniform county-equivalent hierarchy is assumed.
- **Future consumers:** institutions, sourced data, geographic reputation, populations, elections, coalitions, offices, laws, and maps.

## Person

- **Owns:** stable identity, generation key, name, birth date, home jurisdiction, detail level, established facts, and optional stored materialized facts.
- **Stable IDs exposed:** `Person.id`; person fact IDs.
- **Referenced by:** events and participants, family facts, memories, knowledge, claims, relationship interactions, proposition exposures, political records, work/education/participation/household/kinship/partnership/care/child-authority records, future staff/elections, and UI selection.
- **Queries/APIs:** `personName`, `factsForPerson`, `createLightweightPerson`, `materializePerson`, person/history selectors.
- **Serialization/persistence:** complete person records and detail generator version round-trip in the world snapshot.
- **Temporary scaffolding:** generated names and biographies are synthetic. Stage 4 mind state is sparse and authored or explicitly applied; Stage 5 adds life structures but not playable or autonomous family/career generation, death, or reputation.
- **Future consumers:** all character, life, NPC, staff, campaign, governing, family, archive, and control-transfer systems.

## Biography Facts

- **Owns:** typed stable factual records for birth date, birthplace, residence, family relationship, education, and occupation, with dates, summaries, jurisdiction where relevant, and provenance.
- **Stable IDs exposed:** fact IDs derived from person ID and semantic fact key.
- **Referenced by:** materialization constraints, belief/principle formation context, subject-knowledge provenance, compatibility biography/work/education/residence queries, timelines, and future careers/dialogue.
- **Queries/APIs:** `appendPersonFact`, `factsForPerson`, `factsNewestFirst`, residence/work queries, and subject-knowledge profiles.
- **Serialization/persistence:** stored under people and validated against chronology, references, cardinality, provenance, and stable identity.
- **Temporary scaffolding:** `PersonFact` is compatibility/background detail and has no fabricated append sequence. Employer and education institution remain text summaries; canonical Stage 5 work/enrollment uses stable organization IDs and takes precedence when present. Legacy text is fallback only. Existing fact IDs and nondiegetic materialization behavior remain unchanged.
- **Future consumers:** careers, organizations, expertise, eligibility, dialogue, reputation, family, staff history, and archives.

## Progressive Materialization

- **Owns:** deterministic expansion from lightweight to materialized detail; it owns no separate historical occurrence.
- **Stable IDs exposed:** preserves the same person ID and creates stable fact IDs for generated facts.
- **Referenced by:** person inspection and future selective-activation systems.
- **Queries/APIs:** `materializePerson`, `materializePersonRecord`, and `materializeOrganization`.
- **Serialization/persistence:** generated facts and materializer version are stored; repeated materialization is an idempotent no-op.
- **Temporary scaffolding:** person detail currently adds only synthetic education/occupation facts and resolves subject links through catalog-defined materialization tags; organization promotion currently changes resolution only and does not yet add domain-specific components.
- **Future consumers:** large populations, rising minor NPCs, staff/candidates, event detail, Observer Mode, and performance scaling.

Materialization is a simulation-detail operation, not an in-world event. A lightweight person already existed before expansion. Its keyed RNG stream must remain isolated from unrelated future behavior.

## Organizations

- **Owns:** stable organization identity, formation date, provenance, resolution level, and effective-dated name/classification/location profiles.
- **Stable IDs exposed:** organization and organization-profile IDs.
- **Referenced by:** work relationships, education enrollments, organization participation, organization-held child authority, resource-flow endpoints, event involved-entity references, entity labels, shared-work/school queries, snapshots, and future party, campaign, institution, and finance systems.
- **Queries/APIs:** `createOrganization`, `recordOrganizationProfile`, `materializeOrganization`, `organizationsAt`, `organizationProfileAt`, and `organizationProfileHistory`.
- **Serialization/persistence:** root/profile records share global append sequence and are validated for semantic identity, chronology, provenance, supersession, open classification namespace, and jurisdiction reference.
- **Temporary scaffolding:** no hierarchy, organization-owned resource position/accounting, institution powers, or real organization catalog. An organization may be a typed personal-flow endpoint without acquiring a budget system. Lightweight/detailed resolution currently changes simulation detail only; using an organization in child authority does not itself grant legal powers.
- **Current/future consumers:** completed Stage 5 life/resources; Stage 7 institutions; Stage 9 parties/campaigns; Stage 10 agencies; Stage 11 staff; and archives.

## Work Relationships and Roles

- **Owns:** stable actual or expected person-to-organization/independent work identity; compensation, authority, dependency, and economic-risk dimensions; expected/active/temporarily-inactive/ended state; and effective-dated role/title/occupation/location/time-demand history.
- **Stable IDs exposed:** work-relationship, work-status, and work-role IDs plus person, organization, and jurisdiction references.
- **Referenced by:** active-work and coworker queries, effective compensation flows, life-load assessment, entity/event context, persistence, and future expertise, career, staff, eligibility, and archive systems.
- **Queries/APIs:** `createWorkRelationship`, `recordWorkStatus`, `recordWorkRole`, relationship/status/role history and as-of helpers, `activeWorkRelationshipsAt`, `didPeopleShareOrganizationWork`, and the separate work-compensation bridge.
- **Serialization/persistence:** every root and state record shares global append sequence; validation enforces chronology, status lifecycle, linear supersession, provenance, open work/occupation taxonomy, and stable organization identity. Expected future work persists but remains inactive until a dated activation at or after its start.
- **Temporary scaffolding:** one relationship has one current role profile, while multiple concurrent engagements use multiple relationships. Run C adds exact effective amount/cadence terms and explicit outcomes but not payroll tax/benefits, contracts, workplace hierarchy, job-content progression, unemployment automation, or office-holding semantics.
- **Current/future consumers:** Stage 5 education, employment, apprenticeship, volunteer, service, and income; Stage 7 office/institution links; Stage 11 assignments/staff; dialogue; eligibility; and archives.

## Education Enrollment

- **Owns:** stable actual or expected person-to-organization enrollment identity, an open program key, and expected/active/completed/withdrawn/transferred/ended lifecycle history with open context semantics.
- **Stable IDs exposed:** education-enrollment and education-state IDs plus person and organization references.
- **Referenced by:** education history/current-state queries, shared-school context, typed Stage 4 life evidence, persistence, and future progression/dialogue/eligibility systems.
- **Queries/APIs:** `createEducationEnrollment`, `recordEducationEnrollmentState`, enrollment/state history and as-of helpers, `activeEducationEnrollmentsAt`, canonical-first education evidence, and shared education/work organization queries.
- **Serialization/persistence:** roots/states share global append sequence; validation enforces stable identity, actor/organization references, actual-versus-expected chronology, terminal lifecycle, supersession, provenance, and open taxonomy. Future expected enrollment is inactive until explicit activation.
- **Temporary scaffolding:** no GPA, grade, credential, degree, major, admission, school-stage catalog, progression content, or embedded schedule. Organization profile history supplies dated names.
- **Current/future consumers:** Run B formative/adult education and training content; dialogue; eligibility; archives; and later institution data.

## Organization Participation

- **Owns:** stable person-to-organization non-work affiliation/activity identity, open participation and optional role/context keys, and expected/active/inactive/ended state history.
- **Stable IDs exposed:** organization-participation and participation-state IDs plus person and organization references.
- **Referenced by:** membership/activity history, typed Stage 4 life evidence, persistence, and future relationship/dialogue/content systems.
- **Queries/APIs:** `createOrganizationParticipation`, `recordOrganizationParticipationState`, history/state/as-of helpers, and active participation queries.
- **Serialization/persistence:** roots/states share global append sequence and validate identity, references, actual-versus-expected chronology, lifecycle, supersession, provenance, and open taxonomy.
- **Temporary scaffolding:** actual service/work, including genuine volunteer labor, remains a `WorkRelationship`. Meaningful recurring demand uses `LifeCommitmentRecord`; one activity does not automatically require its own organization.
- **Current/future consumers:** Run B school/community activity content; Run C relationship integration; dialogue; reputation; campaigns; and archives.

## Households and Co-residence

- **Owns:** stable household identity, effective-dated jurisdiction/location history, stable person membership, and resident/ended states with primary/secondary/shared residence roles.
- **Stable IDs exposed:** household, household-location, household-membership, and membership-state IDs.
- **Referenced by:** co-residence, residence-geography, dwelling occupancy, resource-position/flow endpoints, event entity references, care context, persistence, and future housing/resource consumers.
- **Queries/APIs:** household creation/location/membership transitions; `householdLocationAt`, `householdMembershipsAt`, `peopleInHouseholdAt`, and `hasHouseholdResidenceInJurisdiction`.
- **Serialization/persistence:** append-oriented roots/states are validated for identity, chronology, supersession, provenance, jurisdiction references, and no overlapping primary residence. Concurrent secondary/shared memberships remain valid.
- **Temporary scaffolding:** household location remains jurisdiction plus label and is not a dwelling, lease, room, or ownership interest. A household may now own a tracked liquid position or be a typed flow/occupancy/tenure endpoint, but membership is never inferred or generated from those records.
- **Current/future consumers:** Stage 5 formative/adult movement, housing/resources/relationships; Stage 6 events; eligibility/geography; and archives.

## Kinship, Partnership, and Care

- **Owns:** canonical paired kinship, partnership with active/ended state history, and directed caregiver-to-recipient responsibility with share/context/time-demand state history.
- **Stable IDs exposed:** kinship, partnership/state, and care-responsibility/state IDs plus canonical person references.
- **Referenced by:** structural relationship queries, trusted-cue kin/partner context, life-load assessment, persistence, and future family/relationship/resource systems.
- **Queries/APIs:** record/create/state transitions; `kinshipRelationshipsAt`, `activePartnershipsAt`, care state history, and `activeCareResponsibilitiesAt`.
- **Serialization/persistence:** records share global append sequence and validate distinct people, canonical pair ordering, chronology, lifecycle/supersession, provenance, open content kinds, and care time semantics.
- **Temporary scaffolding:** no generation, marriage law, household inference, or automatic relationship interactions. Run C may link care to a separate flow/obligation and may append meaningful social episodes, but neither changes structural truth or creates automatic monthly upkeep.
- **Current/future consumers:** completed Stage 5 formative/adult family, relationship, and resource systems; decisions; dialogue; eligibility; staff continuity; and archives.

## Child Authority

- **Owns:** stable effective-dated authority/responsibility identity from a child person to either a person or organization holder, with open authority/basis keys and active/ended state history.
- **Stable IDs exposed:** child-authority and authority-state IDs plus child and person-or-organization holder references.
- **Referenced by:** authority history/as-of queries, typed Stage 4 life evidence, persistence, and future guardianship, eligibility, care, dialogue, and institution adapters.
- **Queries/APIs:** `createChildAuthority`, `recordChildAuthorityState`, authority/state history, active authority for a child, and authority held by a person.
- **Serialization/persistence:** roots/states share global append sequence and validate distinct person identities, holder references, chronology, lifecycle/supersession, provenance, and open authority/basis taxonomies.
- **Temporary scaffolding:** no statutory power bundle, parentage inference, custody litigation, visitation calendar, universal autonomy age, or jurisdiction-specific guardianship law. Authority creation never creates or changes kinship, care, partnership, or household membership.
- **Current/future consumers:** Run B formative guardian context; Run C family/resources; Stage 7 effective law/institutions; dialogue; decisions; and archives.

## Time Demand and Life Load

- **Owns:** reusable weekly range, attention, concurrency, rigidity, interruptibility, and optional location profile; exceptional commitment records; qualitative load assessment; and deterministic seven-day load/recovery resolution.
- **Stable IDs exposed:** life-commitment and life-load-resolution IDs; contributor references point to work-role, care-state, or commitment IDs. Resulting fatigue has a temporary-state ID referencing its source resolution.
- **Referenced by:** active work and care, Stage 4 temporary-state perception/decisions, headless demo, persistence, and future scheduling/content adapters.
- **Queries/APIs:** `recordLifeCommitment`, `activeLifeCommitmentsAt`, `assessLifeLoadAt`, `resolveLifeLoadPeriod`, `lifeLoadResolutionHistory`, and `fatigueAt`.
- **Serialization/persistence:** commitment and resolution records share global append sequence. Integrity recomputes stored assessment/output/fatigue semantics, validates the historical cutoff and contributor refs, and resolves the load-to-temporary-state provenance edge.
- **Temporary scaffolding:** deterministic qualitative calibration, not a medical model, hourly calendar, 168-hour subtraction, universal productivity score, or automatic time engine. Only explicit completed seven-day periods resolve consequences.
- **Current/future consumers:** Run B life-path commitments; Run C resource-linked life play; Stage 9 campaign load; Stage 10 governing duties; Stage 11 staff workload/delegation; and later health/event consequences.

Education and participation do not contain duplicate time-demand fields. When content assigns meaningful recurring load, it records an ordinary commitment whose contributor is independently queryable.

## Personal and Household Resource Flows

- **Owns:** exact personal/household liquid opening positions; typed person/household/organization flow endpoints; stable flow basis/restriction/jurisdiction context; append-oriented expected/active/ended amount-and-cadence terms; and separate completed/partial/missed/blocked actual outcomes.
- **Stable IDs exposed:** resource-position, resource-flow, terms, and outcome IDs plus their referenced endpoint and basis IDs.
- **Referenced by:** work compensation, care/support, housing and debt obligations, affordability, typed Stage 4 evidence, character-history plans, persistence, and later compatible campaign/organization/government finance consumers.
- **Queries/APIs:** exact money construction, canonical writers, flow terms/outcome history, current derived liquid position, endpoint flow history, and explicit work-pay-period resolution.
- **Serialization/persistence:** integer minor units and validated currency codes round-trip exactly. Every root/terms/outcome shares the global sequence and validates identity, endpoints, chronology, non-overlapping per-flow settlement intervals, period-start terms, provenance, lifecycle, exact amounts, actor relevance, and source liquidity where tracked.
- **Temporary scaffolding:** one opening liquid position per tracked owner/currency plus meaningful outcomes, not accounts, card purchases, merchants, taxes, interest products, investments, insurance, credit reporting, or arbitrary balance mutation. Cadence does not auto-post transfers.
- **Current/future consumers:** Stage 5 personal life and Stage 4 subjective evidence now; later campaign, organization, and government finance may reuse the vocabulary but must add their own domain identities and rules.

## Major Resource Obligations and Affordability

- **Owns:** stable obligation identity linked to a flow, open basis, optional care or housing context, optional exact debt principal, active/satisfied/ended state, and derived outstanding debt.
- **Stable IDs exposed:** obligation/state IDs and linked flow, care-responsibility, or housing-tenure IDs.
- **Referenced by:** structured affordability, care/support, housing costs, resource-pressure evidence, character-history plans, and persistence.
- **Queries/APIs:** obligation state/history, active obligations, outstanding debt, and `assessAffordability` returning available/strained/blocked status with reason keys, exact liquid evidence, cadence-preserved obligation buckets, and an explicit exact cadence comparison bucket.
- **Serialization/persistence:** debt payments reconcile only from committed outcomes and cannot exceed tracked principal; obligation state and source references obey chronology and append sequence.
- **Temporary scaffolding:** principal/payment history only. No amortization, automatic interest, collections, credit score/report, bankruptcy, underwriting, or hidden financial-health value.
- **Current/future consumers:** Stage 5 life choices and later explicit personal consequences; Stage 6 may supply economic conditions without replacing these identities.

## Dwellings, Occupancy, and Housing Tenure

- **Owns:** stable sparse dwelling identity with jurisdiction/location/classification; separate person-or-household occupancy history; and separate person/household/organization tenure/lease/ownership/assignment history.
- **Stable IDs exposed:** dwelling, occupancy/state, and tenure/state IDs plus household/person/jurisdiction references.
- **Referenced by:** household moves, housing obligations, typed Stage 4 evidence, character-history plans, relationship context, persistence, and future institutions/rules.
- **Queries/APIs:** dwelling/occupancy/tenure writers and date-plus-exclusive-sequence history/current/active queries.
- **Serialization/persistence:** all families share global sequence and validate stable identity, actor/household availability, dwelling chronology, lifecycle/supersession, open semantic keys, provenance, and dangling references.
- **Temporary scaffolding:** no real-estate market, listing, price/appraisal, mortgage underwriting, title registry, zoning, landlord-tenant rules, maintenance, or property simulation. Household location remains geography and is not copied into dwelling identity.
- **Current/future consumers:** Stage 5 adult life, household and support choices; later Stage 6 conditions and Stage 7 effective housing/institution rules.

## Meaningful Relationship Continuity

- **Owns:** no new truth family; it composes ordinary historical events, relationship interactions, direct knowledge, optional memories/appraisals, and optional life commitments, then derives a qualitative evidence projection.
- **Stable IDs exposed:** the existing event, interaction, knowledge, memory, appraisal, and commitment IDs.
- **Referenced by:** relationship continuity/reconnection queries, Stage 4 subjective reasoning, life situations, and later dialogue.
- **Queries/APIs:** `recordRelationshipMoment` and `assessRelationshipContinuity`.
- **Serialization/persistence:** only the existing canonical records persist; the assessment is recomputed and never saved as a score.
- **Temporary scaffolding:** meaningful episodes only, not every message, a monthly tick, closeness/upkeep points, automatic decay/hostility, or relationship deletion after inactivity.
- **Current/future consumers:** Stage 5 reconnection and support; later autonomous life and dialogue may produce more ordinary actions through the same histories.

## Life Eligibility Consumer

- **Owns:** no rules or persistent truth; it is a pure typed request/result boundary around an injected provider.
- **Stable IDs exposed:** references actor, stable jurisdiction, and optional stable context entities; open action and reason keys are semantic identifiers, not entities.
- **Referenced by:** future life action/content resolvers.
- **Queries/APIs:** `evaluateLifeEligibility` and the default `allowAllLifeActions` adapter return allowed or blocked outcomes with deterministic structured reasons.
- **Serialization/persistence:** requests/results are ephemeral. Inputs and provider output are validated; no mutable law is copied into a life record.
- **Temporary scaffolding:** the default permits actions and contains no universal age threshold, 50-state table, school-attendance rule, driving rule, emancipation rule, or territory content.
- **Future consumers:** Stage 7 effective-law/institution providers replace the adapter while preserving Stage 5 life identities.

## Canonical Historical Events

- **Owns:** historical truth for committed occurrences: semantic key, stable ID, global sequence, occurrence/recording dates, type, jurisdiction/location, involved entities, participants/roles, visibility, tags, summary, structured context, and person-fact constraints.
- **Stable IDs exposed:** `HistoricalEvent.id`.
- **Referenced by:** person history, memories, event knowledge, claims, relationship interactions, fact provenance, belief formation, subject-knowledge provenance, and future actions/archives.
- **Queries/APIs:** `recordWorldEvent`, `eventsInvolving`, `eventsNewestFirst`, `queryEvents`, and typed tag/age/geography experience queries.
- **Serialization/persistence:** stored in append-sequence order within the contiguous history and validated for identity, chronology, earlier-sequence references, participants, categorical values, context, and uniqueness.
- **Temporary scaffolding:** committed records exist, but prerequisites, blockers, conditional chains, causal propagation, corrections, and an autonomous event engine are deferred.
- **Current/future consumers:** Stage 4 appraisals and decisions; later dialogue, opposition research, reputation, events, campaigns, governing, staff knowledge, archives, and briefings.

## Memories

- **Owns:** a person's subjective remembered summary, interpretation, strength, relevance tags, formation date, event reference, and explicit supersession.
- **Stable IDs exposed:** `MemoryRecord.id`.
- **Referenced by:** person memory queries, Stage 4 perception/decisions, and future dialogue/relationships.
- **Queries/APIs:** `recordMemory` and `memoriesForPerson`.
- **Serialization/persistence:** append-oriented history records validated against person/event identity, chronology, and compatible supersession. A memory requires direct involvement in the event or prior person-specific event knowledge, and a superseding memory cannot backdate its predecessor.
- **Temporary scaffolding:** no autonomous recall, forgetting, distortion engine, salience updates, or behavioral consequences.
- **Future consumers:** Stage 9 dialogue, Stage 10 political memory, Stage 11 continuity, and Stage 12 briefings.

## Event Knowledge and Provenance

- **Owns:** what one person believes about one event, learned date, accuracy classification, confidence, and source: direct, told-by, public record, media, or rumor.
- **Stable IDs exposed:** `EventKnowledgeRecord.id` plus referenced person/event/claim IDs.
- **Referenced by:** known-by diagnostics, Stage 4 subjective perception, and future imperfect-information reasoning.
- **Queries/APIs:** `recordEventKnowledge` and `knowledgeForEvent`.
- **Serialization/persistence:** append-oriented, with source/reference/chronology integrity checks. Direct knowledge requires event involvement; told-by knowledge requires a different source person and any referenced claim must already exist earlier in the global append sequence.
- **Temporary scaffolding:** accuracy is diagnostic truth metadata; there is no automatic dissemination, correction, source-trust model, or player-facing knowledge filter.
- **Current/future consumers:** Stage 4 subjective perception and decisions; later rumors/media, staff reports, opposition research, dialogue, relationships, archives, and fog-of-information UI.

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
- **Referenced by:** pair histories, legacy work/affected-contact queries, Stage 4 perceived/decision context, and future character reasoning.
- **Queries/APIs:** `recordRelationshipInteraction`, `relationshipHistory`, `didPeoplePreviouslyWorkTogether`, `deriveRelationshipSummary`, and `hasCloseRelationshipWithPersonAffectedByEvent`.
- **Serialization/persistence:** append-oriented and validated for two distinct canonical people, chronology, and compatible event references.
- **Temporary scaffolding:** `deriveRelationshipSummary` uses a coarse hidden calculation solely as an interim contextual helper. It is not authoritative relationship state, cannot replace specific episodes, and is not exposed as a meter. Stable organization work now takes precedence in coworker queries; `work:` interactions and occupation text remain compatibility evidence. Asymmetric trust, obligation, loyalty, third-party effects, and autonomous behavior are deferred.
- **Future consumers:** careers, campaigns, legislation, staff, families, reputation, and archives.

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
- **Temporary scaffolding:** exposure is explicitly recorded rather than automatically propagated. The Stage 4 political adapter can consume a qualifying exposure, but attention, media reach, persuasion, and population opinion propagation do not exist.
- **Future consumers:** Stage 8 population opinion, Stage 9 messaging/media, dialogue, advisers, and archives.

Exposure does not imply a private belief, public statement, campaign commitment, subject expertise, or agreement with the source.

## Political Belief, Speech, Commitment, and Principle Histories

- **Owns:** sparse append-only `PrivateBeliefRecord`, `PublicPositionRecord`, `CampaignCommitmentRecord`, and `PrincipleRecord` histories. Private beliefs separate position, conviction, salience, flexibility, rationale, formation reason/context, and supersession.
- **Stable IDs exposed:** belief, public-position, commitment, and principle-record IDs plus proposition/principle/person and structured formation-source references.
- **Referenced by:** current/history queries and future decision, campaign, dialogue, electorate, legislation, adviser, and archive systems.
- **Queries/APIs:** validated record transitions; private/public/commitment/principle history and latest-state queries; typed private state and dated changes; sparse domain coverage; resolved formation-source lookup.
- **Serialization/persistence:** share the contiguous history sequence and are validated for chronology, catalog/person references, categorical values, perceived source context, earlier-sequence formation references, and linear supersession. Same-day formation context cannot point forward to a record appended later, and a person-valued trusted cue must identify someone other than the person forming the view. A public-position or campaign-commitment source event must already exist, involve the person, and share the record's effective date.
- **Temporary scaffolding:** records may be explicitly authored diagnostic fixtures or, for private NPC belief only, appended by the Stage 4 political adapter after a durable general-decision trace. There is no party normalization, behavior comparison, moral judgment, dense per-person issue vector, or autonomous public speech/commitment engine.
- **Future consumers:** Stages 8, 9, 10, 11, and 12.

Private belief, public position, campaign commitment, and historical behavior remain separate. Principles may conflict and do not automatically synthesize proposition positions.

## Subject Knowledge, Expertise, and Practical Experience

- **Owns:** sparse subject-knowledge history with familiarity, understanding, expertise, practical experience, provenance, and supersession. Supporting education/occupation facts provide a derived fallback; when a latest explicit assessment exists, it is authoritative and can revise an earlier level.
- **Stable IDs exposed:** subject-knowledge record IDs, knowledge-subject IDs, and referenced fact/event/source-person IDs.
- **Referenced by:** political formation provenance, knowledge-profile queries, Stage 4 decision context, the diagnostic viewer, and future choices, dialogue, careers, advisers, staff, and institutions.
- **Queries/APIs:** `recordSubjectKnowledge`, knowledge history/latest/profile/domain queries, and `hasPracticalExperienceForSubject`.
- **Serialization/persistence:** explicit records are in the contiguous history sequence; subjects on education/occupation facts and all provenance references are validated and persisted. Historical-event and other history-source references must already exist earlier in append sequence, and trusted-report provenance must identify another person.
- **Temporary scaffolding:** categorical derivation is a first foundation, not skill decay, pedagogy, credentials, task simulation, or correctness. Biography does not generate ideology.
- **Future consumers:** Stages 5–6 and 9–12, specialized dialogue, staff assignments, and historical dossiers.

## Character Mind, Subjective Perception, and Decisions

- **Owns:** the shared mind catalog; sparse personality/value/goal/appraisal/perception/temporary-state histories; observer or controlled-person state; pure decision evaluations; typed canonical-life source resolution; and durable consequential traces.
- **Stable IDs exposed:** tendency/value definitions, personality/value/goal-state/appraisal/perception/temporary-state records, conceptual goals, decisions, and decision traces.
- **Referenced by:** historical mind queries, subjective projections, the political-belief adapter, deterministic demo, developer viewer, and future life/domain adapters.
- **Queries/APIs:** validated mind-record transitions, non-applying development proposals, `buildSubjectivePerception`, `assertLifeHistorySourceAvailable`, `resolveLifeHistorySource`, date-plus-sequence mind queries, pure `evaluateDecision`, durable trace recording, and explicit NPC political-belief evaluation/application.
- **Serialization/persistence:** all persistent families share the global history sequence and round-trip in world schema 12/snapshot format 11. Validation preserves sparse catalog references, chronology, provenance, supersession, goal lifecycle, typed source availability including resource/housing and policy-analysis records, communication evidence, half-open temporary intervals, life-load and resource-pressure provenance, keyed decision identity, control references, and trace structure.
- **Temporary scaffolding:** categorical definitions and internal comparison weights are deliberately small; legacy biography facts lack append-availability metadata and remain current-frontier-only; routine traces may remain ephemeral; development proposals do not apply themselves; and political belief formation is the only domain adapter.
- **Current/future consumers:** Stage 5 life records are typed evidence, load resolutions reuse temporary states, and Run C resource pressure composes the same appraisal/temporary-state boundary. Stage 6 incidents and later staff/campaign/governing/diplomatic choices plus Stage 12 explanations/Observer Mode remain future consumers.

Decision evaluation remains distinct from application and canonical history. Autonomous application rejects the controlled person. A private belief created by the political adapter links to its prior durable trace; no-opinion and defer retain only the trace. Public positions and commitments are never overwritten.

## History Queries

- **Owns:** no authoritative data; pure typed projections over world records.
- **Stable IDs exposed:** returns source records and their stable IDs rather than copied prose-derived identities.
- **Referenced by:** tests, demo, viewer, and future domain systems.
- **Queries/APIs:** event filters; canonical-first biography residence/work/education; relationship/work and qualitative continuity; organization/profile; work status/role and compensation; education and participation state; shared-school context; household/co-residence; kinship/partnership/care/child authority; resource terms/outcomes/positions/obligations/debt/affordability; dwelling occupancy/tenure; life load/recovery; metric truth/observation source/vintage histories; causal ancestry/effect contributions/root deduplication; derived labor/purchasing-power/fiscal results; future due state; memories/knowledge/claims; political histories/current state/domain coverage; and sparse person-subject profiles/practical experience. Mixed evidence is ordered by its explicit domain-effective/reference period and append sequence, so backfilled older records do not become current merely because they were appended later.
- **Serialization/persistence:** derived results are not stored; authoritative source records are.
- **Temporary scaffolding:** many histories use linear scans. Coworker and education queries retain legacy text fallback only when canonical sequence-aware history is absent. Belief-domain and person-subject profile queries already walk sparse person records; future indexes may optimize other lookups without becoming competing truth.
- **Future consumers:** dialogue conditions, NPC option evaluation, advisers, UI, archives, campaign/legislative systems, and simulation auditing.

## Serialization

- **Owns:** snapshot envelope format, content-derived snapshot ID, metadata, JSON encoding/decoding, version rejection, and full world integrity validation.
- **Stable IDs exposed:** snapshot ID and world ID.
- **Referenced by:** SQLite repository, CLI/demo result, and future save adapters.
- **Queries/APIs:** `createWorldSnapshot`, `serializeWorld`, and `deserializeWorld`.
- **Serialization/persistence:** snapshot format 11 contains world schema 12 and the complete graph; load returns a defensive clone after validating per-family append order, the contiguous global sequence, cross-record chronology and sequence direction, union discriminators, categorical values, life/mind/policy provenance, lifecycle and forecast revisions, typed source availability, exact quantity/unit and money/resource reconciliation, metric correction/observation predecessor chronology, causal graph/effect activation magnitude-basis and timing integrity, future due references/closed states/strict-overdue boundary/outcome events, dwelling/occupancy/tenure references, control references, stored load derivations, and durable trace structure.
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
- **Temporary scaffolding:** synthetic people/events/political records, one community-listening occurrence, and a small authored organization/work/household/care fixture.
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

## Reserved Future Cross-System Contracts

These contracts constrain later stages. Run C implements only the personal/household slice of the shared resource-flow vocabulary; campaign, organization, government, fiscal-law, and civic-data systems remain deferred.

### Shared Resource-Flow Contract

Personal/household flows now implement, and future campaign, organization, and government finance should use compatible concepts for:

- source;
- recipient;
- amount or formula;
- cadence;
- effective period;
- authority or basis;
- restrictions; and
- actual transfer or outcome.

Implemented examples include employer organization to person salary, cross-household support, and person/household housing or care obligations. Donor-to-campaign contributions and government appropriations remain future systems. This is shared vocabulary, not one universal `fundingSource` field or finance root on unrelated objects.

### Fiscal Inspectability Contract

Future laws and programs must be capable of distinguishing estimated fiscal effect, authorized or appropriated funding, funding source, recurring versus one-time cost, actual expenditure, actual revenue, and downstream fiscal effects. A future universal-school-meal program, for example, should expose estimated cost, authorized funding, actual spending, uptake, and administrative cost rather than one opaque price.

### Mutable Law Contract

Future institutions, elections, and government systems query currently effective law or rules wherever legal authority can change behavior. Effective dates, hierarchy, amendments, and transition rules are part of the explanation; permanent constants are not the source of truth for mutable terms, eligibility, powers, procedures, thresholds, succession, or districting.

Run A's life-eligibility provider is the current consumer seam for that future authority. It is not itself a law source and must be supplied by the effective-rule resolver when Stage 7 arrives.

### Progressive Resolution Contract

Background people, organizations, courts, jurisdictions, countries, and events remain lightweight until relevance requires promotion. Promotion adds detail without changing stable identity, historical existence, established facts, or existing references.

### Civic Reference Contract

Real-world civic records retain enough dated provenance to inspect a concept, explain the controlling rule, show historical versions, distinguish starting data from simulated change, and open an official source when available.

## Current and Future Connection Points

- **Current Stage 4 decisions:** consume perceived facts, typed historically available life records, memories, event knowledge, relationship episodes, sparse political records, subject expertise, incentives, temporary fatigue where relevant, and keyed RNG; emit explainable evaluations and optional durable diagnostic traces separately from canonical outcomes.
- **Completed Stage 5 foundation:** supplies stable organizations; work, education, participation, household, care and authority histories; exact personal/household flows, work compensation, major obligations/debt, derived liquid capacity and affordability, stable dwelling/occupancy/tenure history, time/load/recovery, meaningful relationship continuity, typed Stage 4 life evidence, the future-rule eligibility consumer, and one played/quick/authored plan applicator. It contains no competing career, family, biography, balance, housing, or relationship truth store.
- **Stage 6 Run A:** supplies exact scoped quantitative truth, separate fallible observation vintages, sequence-aware queries, and one authoritative-time future due mechanism without replacing Stage 5 resources or ordinary events.
- **Stage 6 Run B:** supplies append-oriented causal ancestry, typed exact effect activations with target-period phase and durable magnitude bases, root-cause deduplication, primitive/derived metric enforcement, and bounded aggregate labor/income-cost/proxy/fiscal derivations without automatic dynamics or replacing Stage 5 personal resources.
- **Stage 6 Run C:** supplies frozen quantitative policy alternatives/operations/baselines/estimates, explicit distribution and implementation evidence, person-specific analysis knowledge, and separate realization through the Run A/B seams without implementing law or institutions.
- **Future Stage 6 Runs D–E:** consume the same metrics, time, causal identity, and effects to add generalized incidents/chains and later mortality/incapacity/evidence through separately validated boundaries; definitions remain separate from committed history.
- **Stage 7 geography/institutions:** extend stable jurisdiction hierarchy and sourced/effective-dated definitions without changing generic simulation assumptions.
- **Stage 8 populations:** reference propositions, geography, cues, and public records sparsely; never materialize every voter or every issue.
- **Stage 9 campaigns:** create persistent contest/candidate/staff/message/poll identities and historical records rather than generic points.
- **Stage 10 legislation:** define stable proposal, revision, provision, amendment, procedure, and action IDs; map political beliefs to specific propositions/provisions without conflating them.
- **Stage 11 staff:** use the same `Person` and history/knowledge/relationship systems, adding stable roles, assignments, reports, and delegation records.
- **Stage 12 archives/branches:** index existing records; add branch lineage without mutating the parent world or duplicating contradictory truth stores.
