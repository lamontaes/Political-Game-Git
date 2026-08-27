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
Player shell (src/player) -> presentation projection/state (src/presentation)
                    \                     /
                     v                   v
                 Pure simulation API (src/simulation/index.ts)
                              ^
                              |
                  Diagnostic viewer (src/ui)
                 |
                 v
Domain state + deterministic transitions + history

Node desktop adapter (src/persistence)
                 |
                 v
          SQLite snapshots
```

- `src/simulation/` contains JSON-safe domain types, deterministic utilities, world operations, a canonical zoned minute-level moment, exact scheduled activities and office work/assignment history, policy, mind, world-metric, causal-mechanism, incident-definition, and vitality catalogs, append-oriented history, exact quantity and money primitives, separate quantitative truth and observation vintages, append-oriented causal ancestry and effect activations, explicit exact aggregate-economy/fiscal derivations, frozen quantitative policy baselines/operations/estimates and explicit implementation realization, generalized incident occurrence/state/follow-on records, bounded mortality/death/functional-capacity history, objective evidence artifacts and explicit person discovery, one date-level future-transition mechanism, sparse political and character-mind records, subjective-perception projections, the general decision evaluator and political-belief adapter, persistent organizations/work/education/participation/households/care/child-authority history, exact personal/household resource flows and housing histories, a canonical character-history plan applicator, bounded formative situations, compositional adult path helpers, meaningful relationship-history helpers, qualitative life-load resolution, a future-rule eligibility consumer, progressive entity detail, and the demo scenario.
- `src/persistence/` contains Node-only durable-storage adapters and depends on the public simulation snapshot codec.
- `src/cli/` contains Node-only executable entry points.
- `src/presentation/` contains React-independent epistemic selectors,
  inspectorial, conversation-session, and working-document state, deterministic
  Run A/Run B/Run C/Run D-Lite fixtures, a bounded canonical-conversation
  adapter, the provision-to-policy bridge, epistemic agenda/work projection,
  browser persistence, and semantic scene-placement validation. It may read the
  simulation and compose its public writers for explicit fixtures,
  known-analysis review, committed conversation turns, one office working-draft
  instruction, scheduling, assignment, and exact activity performance; the
  simulation never imports it.
- `src/player/` contains the normal player-facing React scene and shell.
- `src/ui/` retains React diagnostics with explicitly omniscient developer access.
- `src/App.tsx` selects the player scene by default and the developer viewer only
  for `?view=developer`; `src/main.tsx` is the browser entry point.
- `data/snapshots/` is reserved for versioned real-world source material, never live save history.

The UI and presentation projection may depend on the simulation. The simulation must never depend on React, browser globals, UI/presentation state, SQLite drivers, paid APIs, or graphical execution.

## Simulation Boundary

The simulation owns world state and all transitions. UI code submits explicit actions and reads returned state; it does not directly invent domain facts.

Run A inspectorial state is deliberately outside the simulation. Epistemic
selectors expose a bounded, qualitative subset of canonical state; browser
learned-concept storage and manual pin sizing do not enter `World`, history, or
snapshot persistence. Opening player UI therefore cannot advance the date or
consume simulation randomness. Presentation-only fixture role and scene
geometry remain synthetic; Run D-Lite replaces the old display-only office
clock with canonical World time without establishing Stage 7 institutions or
rules. See [Player Presentation and Epistemic Projection](docs/systems/player-presentation.md).

Run B gives the player session the smallest World owner needed for substantive
actions. The React owner replaces one immutable `World` only after the bounded
conversation adapter succeeds; ephemeral addressee, audibility, dialogue,
transcript, collapse, and local-turn state remains separate. The adapter creates
no parallel room, world, or history model. It composes existing public Stage 6
writers in strict order and returns only a filtered semantic/presentation result
to the strip. Same-date conversation order is history sequence, never action
sequence or a fabricated clock.

Stage 6.5 Run C keeps the Transit Access Pilot document, provisions, variants,
selections, annotations, compare state, and clean-document state in the
React-independent presentation layer. Its quantitative provision stores an
explicit link to prepared Stage 6 `PolicyAlternativeRecord`,
`PolicyOperationRecord`, and `PolicyEstimateRecord` identities; rendered prose
is never parsed to infer effects. Player-visible staff interpretation requires
ordinary actor-specific policy-analysis knowledge. The current office draft is
derived from one exact same-date `office.working-draft-revised` event linking
both prepared alternatives and operations. That event neither realizes policy
nor creates law, legislation procedure, authority, appropriation, effect
activation, or metric truth.

Stage 6.5 Run D-Lite upgrades World schema 15 and snapshot format 14 with one
canonical `SimulationMoment`: date, minute of day, supported IANA zone identity,
and explicit UTC offset. The zone must be supported and the local fields/offset
must describe the same instant. `currentDate` must equal the moment date;
whole-day advancement preserves local minute/zone and resolves the target-date
offset, while exact-minute advancement derives local fields across DST.
Append-oriented scheduled
activity roots/states own exact intervals, participant conflicts, fixed versus
bounded movable flexibility, travel, and completion. Work roots/states own real
sources, focus targets, assignees, player requirements, dependencies, authored
effort, and lifecycle. Exact minute advancement resolves crossed date-level due
frontiers, staff work, and a selected activity deterministically. Generic
minute movement stops at unresolved controlled-person commitments, and explicit
activity performance cannot skip an earlier commitment or travel block.
`FutureDueItem`
remains date-level; history sequence and action sequence remain ordering/seed
inputs, not clocks. See
[Canonical Sub-Day Time, Scheduled Activity, and Office Work](docs/systems/time-work.md).

Stage 6.5 post-D-Lite visual integration remains entirely above the simulation
boundary. The existing art manifest is the sole runtime asset registry;
`src/presentation/visual-integration.ts` filters its released records, resolves
their build URLs, and owns typed environment, scene-anchor, character-root,
seated-contact, authored-outfit, scale, depth, occlusion, and interaction-bound
composition. Anonymous appearance recipes map to displayed scene roles only.
They never become `Person` identity, facts, traits, knowledge, or history.
`OfficeScene` retains semantic DOM controls and code-authored labels while the
environment and character images remain pointer-transparent and hidden from
the accessibility tree. Deterministic clipped copies of the one approved room
plate supply foreground furniture occlusion without a second environment or
asset registry. No `src/simulation/` dependency points back to this layer.

The initial domain includes:

- a JSON-safe `World` with a stable ID, normalized seed, canonical zoned minute-level moment consistent with its current simulated date, entities, action sequence, generator version, and history;
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
- exact integer-minor-unit personal/household resource positions; typed person/household/organization flow endpoints; expected/effective flow terms; actual completed/partial/missed/blocked outcomes; major obligation/debt state; and structured affordability projections;
- stable dwellings plus separate effective person/household occupancy and person/household/organization tenure, ownership, lease, hosting, and assignment histories;
- an exact reduced-rational non-money quantity primitive with open units; a stable world-metric definition catalog; jurisdiction/optional-segment scopes; explicit point/interval periods; append-oriented canonical metric state and explicit non-backdated corrections; and separate source-series observation vintages with exact compatible uncertainty and non-backdated revisions;
- a stable causal-mechanism definition catalog with exact linear/bounded response curves; append-oriented causal-process ancestry and effect activations with durable point/interval magnitude bases; distinct-root anti-double-counting queries; explicit cutoff-aware, target-period-phased aggregate metric evaluation; primitive/derived metric separation; and bounded labor, nominal/cost purchasing-power, aggregate proxy, and fiscal derivations;
- stable quantitative policy alternatives; immutable exact scoped operations; dated source-bearing counterfactual baselines and estimate revisions; five separate implementation factors; projected causal roots; and explicit blocked/partial/full realization through ordinary Run B effects rather than forecast mutation;
- data-driven possible-incident definitions separate from committed incident identity, immutable evaluated-risk snapshots, ordinary onset/phase events, append-only active/resolved state history, exact Run B consequences, and typed transition plans through the one future-due seam;
- a stable vitality catalog with exact age-indexed annual mortality probabilities; materialized-person mortality plans/results through the existing future-due seam; durable person-death truth; sparse functional-capacity history; and cutoff-aware alive/capacity eligibility without removing person identity or prior history;
- objective evidence artifacts related to earlier ordinary event or incident truth, with closed access metadata but no implicit knowledge; explicit per-person discovery history through one ordinary discovery event and one direct event-knowledge record; and created/discovered-date plus exclusive-sequence queries;
- one stable future due-item identity with an exact closed scheduled/resolved/cancelled/blocked state vocabulary and deterministic nonserialized handlers integrated with authoritative time advancement; a scheduled due-today item is valid pending work, while a scheduled overdue item is invalid;
- stable scheduled-activity identities with append-only exact interval state, participant conflict/flexibility/travel semantics, and ordinary completion history;
- stable office work identities with append-only assignment, player-requirement, dependency, authored-effort, scheduling-link, and completion state;
- ranged time-demand profiles and qualitative deterministic load/recovery resolution over active work, care, and exceptional commitments, reusing temporary states for fatigue;
- an explicit observer/person control state that protects a controlled person's major internal choices from autonomous application;
- reusable query helpers over facts, event tags, age, geography, experience, relationship context, stable organization work/education/participation, households, kinship, partnership, care, child authority, exact liquid position, obligations, affordability, dwelling occupancy/tenure, qualitative relationship continuity, life load, proposition history, principles, knowledge, expertise, character mind, perception, decision traces, historical vitality/capacity, and evidence/discovery;
- a pure general decision evaluator with hard constraints, conflicting soft considerations, isolated bounded randomness, source snapshots, and separate proposal/application steps;
- autonomous political-belief formation as the first domain adapter over that evaluator; and
- deterministic time advancement and demo occurrence generation.

Names and collection positions are not identity. Entity references use stable IDs. World construction validates and defensively copies caller-owned entity graphs. State-changing transitions return new objects and do not mutate their input world; an idempotent no-op may return the unchanged input object.

## Determinism

For a fixed generator version, the same normalized seed, starting state, and ordered valid actions must produce the same material state and history. Different seeds must vary meaningful generated content, not merely seed metadata.

All stochastic behavior in the simulation passes through `SeededRng`. It combines a pinned seeded algorithm with non-consuming keyed forks. A person materialization stream is derived from the world seed and stable person ID; a time-advance occurrence stream is derived from the seed and time-action sequence. A decision stream is derived from the stable decision and actor IDs and then forked by stable option key. UI selection, render order, person materialization, option order, or evaluation of another actor cannot consume randomness that changes a decision.

Persistent IDs are hashes of explicit stable keys, not random draws, names, or display positions. An event's semantic key is unique within a world, is stored with the event, and determines its ID; action parameters therefore belong in keys when they distinguish occurrences. Event sequence separately records append order.

World schema version 14, generator version `demo-world-v14`, person-materialization version 4, policy-, mind-, world-metric-, causal-mechanism-, incident-definition-, and vitality-catalog versions, and snapshot format version 13 are stored explicitly. Stage 6 Run E advances the world and snapshot boundaries because vitality catalog v1, mortality/death/capacity history, and objective evidence/discovery history are persistable; incident catalog v1, metric catalog v2, and causal catalog v1 remain unchanged. Older world and envelope versions are rejected because no migration chain is promised yet. This build promises same-version reproducibility only and does not fabricate migration sequence for legacy biography facts.

## Time

Simulation dates are validated `YYYY-MM-DD` strings. Calendar arithmetic uses UTC-safe, date-only functions and never local time, locale parsing, or the machine clock. Time advancement is a positive whole-day action. Its system history record makes clock transitions auditable without pretending they are political occurrences. `advanceWorld` also owns the one future-transition seam: scheduled items due on the starting date or crossed by an advance resolve in due-date then creation-sequence order through injected deterministic handlers. A due-today item is valid pending work but must settle before time can advance past that date; missing or failing handlers make the proposed immutable advance fail atomically. Handlers remain ordinary compositional simulation code and can use validating canonical writers, including later follow-on scheduling.

## Progressive Resolution

A lightweight person has a stable identity and established facts. Materialization adds deterministic, stored background detail without changing the person's ID, name, birth date, home jurisdiction, established facts, simulated date, or history.

Materialization is additive, idempotent, order-independent, and not itself an in-world event. The first materializer checks established fact kinds and explicit person-fact constraints in canonical history; constrained fields remain unknown. Adding a later historical constraint that conflicts with stored generated detail is rejected atomically. Future materializers must retain this contract, leave details unknown when no consistent result is available, and retain the generator version used.

Pre-play character-history construction is separate from materialization. It may deliberately append backdated canonical records through the normal writers, including deterministic `generated` provenance, but only through an explicit played/quick/authored history plan. Creating a bounded persistent peer, teacher, mentor, or caregiver is likewise an explicit stable-person construction step. Inspecting or materializing an unrelated NPC remains history-neutral.

Education and occupation facts carry stable knowledge-subject IDs. Materialization can therefore add fact-derived categorical expertise without assigning beliefs, principles, goals, personality, or ideology. Those `PersonFact` records retain their existing IDs and no append sequence is fabricated: they are compatibility/background summaries, while canonical detailed education, work, co-residence, participation, care, and authority use sequence-aware Stage 5 histories. Organizations follow the same resolution principle: a lightweight organization already has stable identity and effective-dated profile history, and promotion to detailed resolution is nondiegetic and preserves every reference. Progressive resolution affects computational detail, not whether an entity has existed historically.

## History

History is append-oriented and is the basis of explanation, archives, memories, relationships, political evolution, character development, decisions, ordinary life, and returning-player briefings. Canonical events, subjective memories, person-specific event knowledge, claims, relationship interactions, proposition exposures, private beliefs, public positions, campaign commitments, principles, subject knowledge, personality tendencies, personal values, goal states, appraisals, perceptions, temporary states, durable decision traces, organizations and profiles, work relationships/statuses/roles, education enrollments/states, organization participations/states, households/locations/memberships, kinship, partnerships, care responsibilities, child authorities/states, life commitments/load resolutions, resource positions/flows/terms/outcomes/obligations/states, dwellings/occupancies/states/tenures/states, metric truth/observation vintages, causal processes/effect activations, quantitative policy alternatives/baselines/operations/implementation profiles/estimates/realizations, incident identities/states/transition plans, mortality plans/results, person deaths, functional-capacity changes, evidence artifacts/discoveries, and future due items/states are separate record families sharing one global sequence. Corrections, measurement and forecast revisions, disputed claims, inaccurate knowledge, changed interpretations, renamed organizations, transfers, promotions, moves, leave/return, changed care, ended authority, compensation changes, missed payments, due outcomes, incident phase changes, capacity changes, discoveries, and later statements are new linked records rather than silent rewrites.

Canonical quantitative world state and source-specific observations are deliberately different. Exact safe-integer rational quantities retain open unit identity; metric definitions retain jurisdiction/segment scope rules and point/interval periods; competing observation series and vintages may disagree with each other and truth. Neither truth nor observation becomes person knowledge automatically. An ordinary historical release plus existing event-knowledge provenance supplies the explicit subjective bridge. See [World State, Observations, and Future Transitions](docs/systems/world-state-and-observations.md).

An event's rich context preserves location and setting, participants and roles, visibility, tags, social pressure, choice, motivation, and immediate reaction when known. Knowledge provenance distinguishes direct experience, another person's account, public record, media, and rumor. A claim explicitly records its relationship to historical truth but never changes that truth. Automatic knowledge propagation and generalized event correction records remain future extensions.

Stage 6 Run B implements the causal-graph portion as provenance rather than a duplicate event store. A root or downstream causal process cites available canonical sources/parents; multiple effect activations can share one root, and distinct-root queries deduplicate correlated branches without collapsing independent causes. Every activation carries a durable magnitude basis: points phase at their target point, while interval totals match only their one exact calibrated interval. Evaluation uses that historical target period, not its later evaluation/recording frontier, and cannot silently mutate world fields. Resulting canonical metric truth uses the existing writer and cites its baseline plus contributing activations. Aggregate labor, purchasing-power, and fiscal balance queries retain exact source-state IDs and do not become independently mutable truth. See [Causal Mechanisms, Lightweight Economy, and Fiscal Continuity](docs/systems/causal-economy-and-fiscal.md).

Stage 6 Run C keeps descriptive proposition metadata separate from exact quantitative policy truth. An alternative owns one or more closed typed operations over frozen baseline revisions, explicit metric/scope/period, exact magnitude, and five independently inspectable implementation factors. An estimate and shared projected causal root create no activation or metric truth. A full/partial realization must link exactly to that estimate's projected root and operation-derived Run B effects; one alternative has at most one such realization, and a superseded estimate cannot be newly scheduled or realized. Its sole delayed due item is tied to that estimate, the earliest operation start, and a shared jurisdiction only when one exists. Integrity reconstructs scheduling validity at that due record's own sequence: its estimate was then current in its series and no earlier effect-producing realization had already implemented its alternative. Later records do not corrupt a valid historical schedule; if they make it obsolete, the frontier handler cancels with a typed reason rather than substituting or producing another effect. Only later explicit aggregate evaluation may write canonical metric state. Policy analysis becomes subjective through an ordinary per-person event-knowledge path; the decision adapter consumes actor interpretation without an ideology or feasibility score. See [Quantitative Policy Semantics, Baselines, and Implementation](docs/systems/quantitative-policy.md).

Stage 6 Run D keeps a catalog definition of a possible incident separate from any historical occurrence. Explicit evaluation applies a small inspectable typed rule family at a date-plus-sequence cutoff, then uses a non-consuming keyed RNG draw for a probabilistic definition. A persisted occurrence snapshot is reconstructed by that same non-recursive evaluator from its exact stored input and cutoff, so base/final likelihood, rule/modifier evidence, RNG, risk factors, and consequences cannot drift. Exposure, vulnerability, and resilience independently scale exact consequence magnitude as `exposure × vulnerability × (1 − resilience)` and never alter hazard likelihood. A committed occurrence creates ordinary onset/phase events, a dedicated root causal process, durable incident/state records, and ordinary Run B effects; it never grants person knowledge. Follow-ons use one canonical transition plan and one existing future due item only when the plan's source state and the active state at due-item creation are the same record. A later state that makes a once-valid scheduled follow-on obsolete terminally cancels it at its due frontier instead of preventing time from advancing. See [Generalized Incidents and Follow-Ons](docs/systems/incidents.md).

Stage 6 Run E adds sparse vitality and evidence boundaries without turning either into a universal simulation tick. Exact age-indexed mortality tables schedule materialized people through the one future-due seam; keyed checks produce durable results, require the exact same-table next birthday when supported, and, when applicable, create one mutually linked death event/record without deleting the person, relationships, resources, or earlier history. Run A ordering, exact due-date execution, terminal metadata, and a resumable pre-terminal checkpoint are reconstructed at integrity. Functional capacity is sparse append-only state, and only deceased or incapacitated status is universally blocked by the shared action-availability adapter; limited status remains available for domain-specific rules. Actor-initiated incidents require exactly one actor through that gate. Objective evidence is a durable artifact related to earlier event or incident truth and retains `public`, `restricted`, `private`, or `sealed` access metadata without granting knowledge. Discovery composes exactly one ordinary `evidence.discovered` event, one discovery record, and one direct event-knowledge record for the discoverer. It teaches neither other people nor the artifact's related source events. Vitality and evidence queries use effective date plus exclusive global sequence, so later-appended backfill cannot leak into an earlier frontier. See [Vitality and Functional Capacity](docs/systems/vitality-and-capacity.md) and [Evidence and Discovery](docs/systems/evidence-and-discovery.md).

Private belief is proposition-specific and categorical across position, conviction, salience, and flexibility. Absence means no formed belief, not neutral. A separate sparse proposition-exposure record distinguishes never encountering a question from encountering it without forming a view. Principles, personal values, personality tendencies, public speech, campaign commitments, expertise, and historical behavior remain distinct.

Explicit political and mind records can reference only validated information available to the person before the record or decision cutoff. A closed typed life-record reference lets perception, appraisal provenance, and decisions cite person-involved canonical Stage 5 evidence without routing it through `PersonFact`; the record must exist and precede both the as-of date and exclusive append-sequence cutoff. Event context that the person neither experienced nor knows is rejected rather than becoming an omniscient rationale. A person-sourced trusted cue requires a perception with an actual earlier communication record and relationship provenance; another person's private belief is never read as communicated information.

Person history in the viewer is a query over the canonical global event store. Political histories and knowledge profiles are queries over their corresponding sparse record families and factual biography; none is maintained as a mutable score vector on `Person`.

Actual work is a stable relationship rather than a current-career field or employer string. Expected future work is recorded before its planned start but remains inactive until a dated lifecycle transition. Occupation facts remain biography/expertise summaries. Effective compensation terms attach to that work identity and create money only when a period is explicitly resolved as an actual transfer outcome. A household is distinct from family, partnership, care, dwelling, occupancy, tenure, and jurisdiction; membership, location, occupancy, and tenure histories preserve movement and valid multi-residence without inferring kinship or ownership. Care can be shared and cross-household.

Education enrollment is a stable person-to-organization relationship rather than school-name text. Expected enrollment remains inactive until a dated activation, and completion, withdrawal, transfer, or ending appends state. Non-work participation is distinct from both education and actual work; meaningful recurring activity demand is an ordinary life commitment. Child authority is a separate child-to-person-or-organization structural relationship and neither implies nor is inferred from kinship, co-residence, partnership, or care.

`CharacterHistoryPlan` is orchestration only: played choices, quick generation, and manual authorship apply the same validated transition intents through existing writers. Bounded formative content uses 0–7, 8–12, and 13–17 resolution pacing rather than weekly turns. Its consequential situations append ordinary events, interactions, knowledge, memories, appraisals, temporary context where warranted, and non-applying development proposals. Apprenticeship, volunteer, education, ordinary work, Guard/Reserve activation, relocation, resource initialization, compensation, flows/outcomes, obligations, dwellings, occupancy, and tenure compose the existing records. Orchestration-only `*StableKey` references are resolved and stripped before writer input so they cannot leak into canonical records. The plan adds no career object, friendship score, generalized event DSL, law source, or UI layer.

Run C implements D-025's shared resource vocabulary only for bounded personal/household life. Money is an integer count of minor units plus a validated three-letter currency identity. A flow retains typed endpoints, basis, restrictions, effective terms, and cadence; actual outcomes are separate and are the only records that change a derived tracked liquid position. One flow may commit only one outcome for each non-overlapping inclusive settlement interval, including partial, missed, and blocked outcomes. Settlement validates the active terms at the period start; a later occurrence is allowed, while a term change after that start through the period end is rejected pending an explicit prorating model. Opening positions plus committed outcomes avoid an arbitrary balance-mutation API. Obligations and debt principal are stable arrangements distinct from payment outcomes, while affordability is a structured derived projection over current liquid position and active major obligations. It keeps exact same-currency obligation buckets by cadence and derives strain only from the caller's explicit exact cadence comparison bucket; it never adds different cadence terms. This is neither an account ledger nor a universal campaign, organization, or government finance object.

Stage 6.5 Run C is a separate presentation milestone from Stage 5 Run C and
Stage 6 Run C. Its working-document state is not enacted law and does not
replace the future law, institution, legislation, appropriations, or procedure
model. Later systems may attach authoritative proposal/revision/provision and
legal-order identities to this bridge without replacing the accepted Stage 6
policy/effect backend.

Meaningful relationship contact, visits, support, missed opportunities, and reconnection append ordinary events, interactions, knowledge, optional memories/appraisals, and optional time commitments. A qualitative continuity assessment explains recent evidence, tension context, or a long gap; it is derived, stores no score, never deletes a relationship, and does not turn inactivity into hostility. Explicit missed or blocked resource outcomes may become actor-relevant typed Stage 4 evidence and support a bounded temporary resource-pressure state; no universal financial-stress or wellbeing value exists.

Time demand preserves a weekly range plus attention, concurrency, schedule rigidity, interruptibility, and optional location constraint. Life-load assessment derives qualitative pressure from active work, care, and exceptional commitments; it does not subtract all duties from 168 hours or expose a universal life score. A resolved seven-day period can trade immediate output for later fatigue or recovery. Resulting fatigue is an ordinary effective-dated Stage 4 temporary state, not a parallel subsystem or player meter. See [Core Life](docs/systems/life.md).

## Character Mind, Perception, and Decisions

The shared `MindCatalog` defines extensible personality tendencies and personal values once per world. A person stores only the sparse historical records that exist for them. Tendencies use definition-specific expressions rather than forcing every characteristic into a bipolar axis. Values remain separate from political principles and policy beliefs. Goals retain one stable conceptual ID across append-only state changes.

Appraisal is personal meaning, not event truth or memory. Two people can appraise one event differently, and absence of an appraisal is valid. A later reinterpretation is an explicitly linked record; it never edits the event, memory, or earlier appraisal. Development proposals are non-applying suggestions backed by source records, not automatic numerical mutations.

Subjective perception is built from person-owned facts, memories, event knowledge, accessible claims, relationship episodes, proposition exposure, subject knowledge, appraisals, explicit perceptions, and active temporary states. Historical decision input uses both an as-of date and an exclusive history-sequence cutoff, preventing a later-appended backdated record from leaking into an earlier evaluation. Because legacy biography facts do not carry append-sequence availability, they are eligible only at the current date/current history frontier; durable traces freeze their exact source labels and content for later explanation. Canonical Stage 5 life sources use ordinary date-plus-sequence availability and freeze the resolved evidence that a decision actually used.

The decision evaluator is pure: it validates and canonically orders options, applies hard constraints before scoring, retains every supporting or opposing consideration, and allows only slight keyed random influence when at least two available options are within the close-choice window. Blocked or clearly separated options receive no random influence. Consideration source types are open semantic keys under validated `mind`, `belief`, `information`, `social`, `context`, `institution`, or `domain` namespaces. Every non-context source requires a resolvable provenance reference; context sources still require a stable key and explanation. Evaluation creates a proposal and structured explanation, not a canonical action. Consequential traces can be appended durably; routine evaluations may remain ephemeral. Domain application is separate and must create the appropriate belief or future event exactly once.

The first adapter evaluates seven political-belief outcomes: no opinion, defer, conflicted, tentative support, support, tentative opposition, and opposition. The no-opinion default is an honest `context:opinion-readiness` consideration rather than a mislabeled risk. No-opinion and defer outcomes record the durable reasoning trace but create no private belief. Other NPC outcomes append or supersede the Stage 3 private-belief record and link its formation to the earlier trace. A substantive proposal supplies conviction, salience, and flexibility explicitly; the selected side does not alias those independent belief dimensions. Autonomous application rejects the currently controlled person; evaluation remains available so a future UI can present player choices.

## Institutions and Geography

Generic code models worlds, jurisdictions, people, organizations, ordinary life, history, and character decisions. Lexington-Fayette-specific facts and rules belong in a jurisdiction definition or sourced snapshot. Stable `Organization` identity is the shared extension seam for schools, employers, associations, parties, campaigns, agencies, courts, and other institutions. Stage 5 uses it for education, participation, organization-held child authority, employer compensation sources, and personal housing/care payees. Being a typed flow endpoint does not create an organization balance, budget, accounting system, hierarchy, power, office, or law. A pure eligibility-consumer seam accepts actor, action, date, stable jurisdiction, context, and structured allowed/blocked reasons; institutional rules that can lawfully change must eventually be supplied by Stage 7 effective-law resolution rather than hard-coded constants.

The product's resolution hierarchy is explicit: Lexington-Fayette is the initial deeply modeled jurisdiction, Kentucky begins at medium resolution, and the United States begins at lower resolution. Those are product targets, not permission to hard-code one jurisdiction's institutions into generic simulation logic.

The first build's Lexington-Fayette jurisdiction is a synthetic placeholder and asserts no detailed real-world civic facts. Kentucky and United States simulation layers are not implemented yet.

## Data Domains and Persistence

Real-world starting data and simulated save history are separate domains:

1. An immutable, sourced snapshot may initialize a new world.
2. The save records exactly which snapshot was used.
3. After initialization, simulated events are authoritative for that save.
4. Updating a repository snapshot never silently rewrites an existing save.

The pure simulation exposes a versioned JSON snapshot codec that validates stable identity, entity ordering, policy-, mind-, metric-, causal-mechanism-, incident-, and vitality-catalog definitions, control references, biography and life-graph invariants, political/mind/life chronology and provenance, lifecycle and supersession chains, typed life-source availability, exact quantity/unit and money/resource integrity, metric correction and observation-vintage predecessor chronology, causal ancestry/effect timing, typed magnitude-period compatibility, incident snapshots reconstructed at their stored cutoffs, vitality plan/result/death/capacity and evidence artifact/discovery/event/knowledge linkage, source availability, future due-item references/closed state/strict-overdue boundary/outcomes, dwelling/occupancy/tenure references, historical cutoffs, decision-source snapshots, and contiguous history sequence at the persistence boundary. A Node-only `SqliteWorldRepository` stores the complete validated snapshot in a strict SQLite table and supports save, load, update, and list operations. SQLite code remains outside `src/simulation/`, so headless domain execution and browser diagnostics do not depend on a storage driver.

This first repository intentionally stores one current snapshot per world rather than prematurely normalizing every domain record into SQL tables. Migration chains, transactional action journaling, branch lineage, recovery policy, and cross-version compatibility remain deferred.

The Vite/Sites static package is only a temporary host for the developer viewer. It is not the desktop product runtime or a persistence-platform decision.

## External Systems

The simulation runs without an LLM, paid model call, network connection, or external AI API. Future optional content assistance must not become a condition of deterministic simulation.

This is an independent work. Proprietary code, assets, text, data extraction, or implementation from _The Political Process_ or any other game is prohibited.
