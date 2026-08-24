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

## D-021 — Appraisal is distinct from event truth and memory

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Represent an appraisal as a person's historically situated interpretation of what an event or experience means to them. It may reference an event, the person's memory or knowledge, involved people, and provenance, but it neither mutates canonical truth nor duplicates the remembered account.

Consequence: two people can experience the same occurrence and retain different meanings, one person can later reinterpret it explicitly, and an event need not create any appraisal or personality change.

## D-022 — Values are distinct from personality, political principles, and beliefs

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Store sparse, historically mutable personal values separately from personality tendencies, broad political principles, and proposition-specific beliefs. Values may conflict and may contribute to decisions without automatically producing policy positions.

Consequence: people who value the same thing may reach different conclusions because of knowledge, experience, other values, goals, relationships, appraisal, and perceived effects.

## D-023 — Autonomous decisions use subjective and explainable context

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Use one general decision architecture across future domains. It evaluates options from the actor's as-of subjective perception, separates hard constraints from soft considerations, preserves structured reasons and uncertainty, and uses isolated keyed bounded randomness only for plausible variation. Autonomous application is restricted to NPCs; major player-controlled internal choices remain proposals or player decisions.

Consequence: unknown canonical truth cannot influence an NPC, an unavailable option cannot win through utility weighting or randomness, and the simulation can explain why an option was chosen or blocked without inventing a retrospective rationale.

## D-024 — Temporary internal states are contextual inputs

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Represent temporary states such as grief, stress, fear, anger, fatigue, or excitement as sparse effective-dated, provenance-bearing context that may influence a relevant decision. They are not a universal mood simulation and are not permanent player-facing meters.

Consequence: later time, rest, health, and life systems can provide contextual inputs without making one state dominate every decision or adding constant maintenance gameplay in Stage 4.

## D-025 — Shared resource-flow architecture is reserved for future systems

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Future personal finances, households, campaign finance, organizations, and government finance should share compatible concepts for source, recipient, amount or formula, cadence, effective period, authority or basis, restrictions, and actual outcome. Do not add one universal `fundingSource` field to unrelated records.

Consequence: later salary, support, contribution, appropriation, revenue, and expenditure systems can interoperate without Stage 4 prematurely implementing money or finance.

## D-026 — Mutable institutional behavior resolves from effective law

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Institutional properties that law or rules can change must eventually be resolved from the controlling authority effective at the queried simulated date, including effective dates and transition rules, rather than permanent constants embedded in institution or election code.

Consequence: terms, eligibility, appointment authority, procedures, thresholds, succession, districting, rights, and powers can change coherently during a save. The law and institution systems themselves remain future work.

## D-027 — Progressive resolution is a global scaling strategy

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Apply progressive resolution beyond people to organizations, courts, jurisdictions, countries, and events. Promotion adds simulation detail while preserving stable identity, established facts, references, and prior history.

Consequence: the world can remain broad at low cost and deepen around relevance without pretending a newly detailed entity only just came into existence.

## D-028 — Civic instruction is diegetic and available on demand

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Teach civic systems primarily through their faithful operation, natural in-world guidance such as orientations, allies, leaders, attorneys, clerks, transition officials, and briefings, plus inspectable reference material and official sources on demand.

Consequence: complexity remains learnable without turning the game into a mandatory textbook sequence or replacing substantive mechanics with simplified tutorial abstractions.

## D-029 — Decision traces are explanations, not canonical actions

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

A decision evaluation trace records available and blocked options, applicable considerations, uncertainty, bounded random influence, and the selected or deferred outcome. It is diagnostic/explanatory state, not the canonical event or action produced by the decision. Consequential traces may be durable; routine traces may remain ephemeral or compact.

Consequence: Observer Mode and debugging can answer why a choice occurred while actual world consequences continue to enter the appropriate canonical history system exactly once.

## D-030 — The Political Process is a rolling capability floor, not the architecture

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Treat the contemporary version of _The Political Process_ as a rolling capability floor for the eventual broad United States political simulation, never as this project's architecture or a source of proprietary implementation. The Lexington vertical slice does not wait for complete parity.

Consequence: before mature national United States scope is called broadly feature-complete, perform a fresh capability audit and match important capabilities or intentionally surpass them through another design.

## D-031 — Architecture rules apply retroactively

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Run the Architecture Integrity Audit at major stage boundaries and whenever a newly discovered architecture principle, failure pattern, or invariant could affect completed work. Earlier stages are not grandfathered. Every plausibly affected implementation is either confirmed compatible, corrected with a contained patch, assigned a concrete dependency-bound future migration, or rejected/superseded when retaining it would compound future work.

Consequence: a stage-completion label cannot preserve incompatible foundations, while the audit remains scoped and does not authorize unrelated rewrites.

## D-032 — Separate closed semantic sets from open content taxonomies

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Treat named examples as illustrative unless an authoritative specification explicitly closes the domain. A genuinely finite state machine, bounded scale, provenance discriminator with distinct validation, or supported typed record family may remain a closed union. Expandable classifications use catalogs or validated semantic namespaces with stable content keys. They must not become either prompt-derived exhaustive enums or untyped strings, `unknown`, and arbitrary metadata bags.

Consequence: content can grow without changing engine control flow, while categories still preserve meaning, validation, query behavior, and provenance.

## D-033 — Semantic behavior is the completion criterion

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Accept a simulation capability only when it performs the intended end-to-end behavior with the correct actor, simulated time, scope, authority, subjective access, effective rules where applicable, history, provenance, determinism, and persistence. A type, stored object, diagnostic rendering, placeholder, manual fixture, or graceful fallback is evidence or tooling rather than completion by itself.

Consequence: acceptance tests must exercise meaningful outcomes and cross-system behavior, not only object construction or UI presence.

## D-034 — Autonomous belief formation preserves independent dimensions

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

The political-belief adapter may select a high-level formation outcome, but it may not silently derive all Stage 3 belief dimensions from that outcome. Applied substantive proposals supply position-compatible conviction plus independently chosen salience and flexibility. Private belief, public position, and campaign commitment remain separate records.

Consequence: equal support or opposition positions can retain materially different certainty, importance, and openness to revision after autonomous formation.

## D-035 — Autonomous rule consumers resolve effective rules

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Extend D-026: when mutable law and institutional rules are implemented, every autonomous system whose behavior depends on them must consume the controlling rule effective for the actor, authority, scope or jurisdiction, and simulated date. It may not continue assuming the original, current-real-world, or default rule after the rule changes.

Consequence: this is a future integration contract for law-consuming systems, not authorization to implement law, institutions, or future institutional AI in Stage 4.

## D-036 — Research-gated bounded implementation runs

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

At a major roadmap stage, first audit the current repository and affected completed systems, then classify reviewed research and adversarial findings as implement now, retroactive correction, dependency-bound deferral, rejection, or a genuine user decision. Implement the accepted scope through one or more bounded, separately validated and checkpointed runs rather than treating the roadmap stage as one indivisible feature batch.

Research examples test semantic adequacy and global diversity; they do not automatically become content, exhaustive enums, special-case branches, or permission to implement a later dependency. A run proceeds without an extra question when the approved brief already resolves all material choices, and its post-implementation semantic audit must ask whether the intended causal behavior works rather than whether a schema can merely store descriptive text.

Consequence: foundational migrations can be corrected before later systems compound them, research remains auditable without creating scope leakage, and a stage may honestly remain in progress after one bounded substage is complete.

## D-037 — Stable life identities, separated relationships, and qualitative load

- Date: 2026-08-22
- Status: ACCEPTED
- Supersedes: none

Represent organizations, actual or expected work engagements, households, household memberships, kinship, partnerships, and care responsibilities as separate stable identities with append-oriented, effective-dated profile or lifecycle records. A job is not an occupation summary, a household is not a dwelling or family, kinship is not partnership, and care neither requires nor implies co-residence. Use validated open semantic namespaces for expandable content and closed sets only for lifecycle and behavior-bearing dimensions.

Represent recurring demand with expected weekly ranges plus attention, concurrency, rigidity, interruptibility, and optional location constraint. Derive inspectable qualitative load and coordination pressure over active work, care, and exceptional commitments rather than subtracting every described hour from 168 or creating a universal life/productivity score. Resolve explicit completed weeks deterministically; any resulting fatigue reuses the Stage 4 temporary-state system with provenance to the load resolution.

Preserve Stage 2 occupation, residence, and family facts as immutable biography/expertise summaries while making Stage 5.1 records canonical for detailed work, co-residence, partnership, and care. Stable canonical work takes precedence over textual employer fallback. Progressive person or organization detail changes resolution without changing historical existence or identity.

Consequence: one persistent person can accumulate concurrent and changing work, homes, structural relationships, care, and recovery history that later systems can query as of date and append sequence without overwriting earlier truth. Expected future work can be known without becoming active. Formative content, adult career content/progression, resources, dwellings/property, relationship maintenance, health, offices, institutions, and player UI remain dependency-bound future work.

## D-038 — Shared life history, participation, authority, and rule-consumer boundary

- Date: 2026-08-23
- Status: ACCEPTED
- Supersedes: none

Represent education enrollment as a stable person-to-`Organization` relationship with separate expected/active/terminal state history, so K-12, postsecondary, and later training share one identity architecture without making school names, grades, credentials, degrees, or majors root-engine ontology. Represent non-work membership, affiliation, and activity through a distinct stable organization-participation relationship; genuine service that is semantically work remains a `WorkRelationship`, and meaningful recurring load reuses `LifeCommitmentRecord` rather than adding activity-specific scheduling fields.

Represent recognized authority or responsibility over a child through a separate effective-dated relationship whose holder is either a `Person` or an `Organization`. Authority does not imply or mutate kinship, partnership, household membership, or care, and no universal age, custody-power bundle, visitation calendar, or jurisdiction-specific guardianship law is embedded in the relationship.

Treat canonical Stage 5 records as sequence-aware typed evidence for Stage 4 perception, appraisal provenance, and decision explanation. A closed engine record-family reference resolves only an existing record belonging to the actor and available before both the as-of date and exclusive global sequence cutoff; durable traces freeze its label and content. Preserve legacy `PersonFact` IDs and nondiegetic progressive-materialization behavior without fabricated append sequence. Birth date remains core identity, birthplace remains compatible origin detail, and education, occupation, residence, and family facts remain summary/fallback evidence only where a canonical sequence-aware family is absent.

Life content asks a typed eligibility provider for an allowed or blocked result with validated open action/reason keys, actor, date, stable jurisdiction, and structured explanations. The default/test provider contains no universal age threshold. Stage 7 effective law may replace this provider without replacing Stage 5 entities, consistent with D-035.

Gameplay remains U.S.-centric while jurisdiction identity stays open and stable; Run A adds no 50-state enum or validation and preserves future territory support. Playable formative/adult paths are Run B; personal resources, housing, and relationship integration are Run C. The generalized event engine, mutable law/institutions, territory-specific law/data, and player-facing UI remain deferred to their owning stages.

## D-039 — Canonical character-history composition and bounded life situations

- Date: 2026-08-23
- Status: ACCEPTED
- Supersedes: none

Played progression, deterministic quick generation, and manual/authored creation use one typed `CharacterHistoryPlan` applicator that delegates exclusively to existing canonical life, event, relationship, knowledge, memory, appraisal, temporary-state, and development-proposal boundaries. The plan is orchestration and content input, never a stored biography, alternate history family, or direct mutation route. `generated` is a closed, auditable life provenance variant for deterministic pre-play construction; authored and simulated-event provenance retain their existing meanings.

Formative life resolves through sparse 0–7, 8–12, and 13–17 interval bands and a deliberately bounded situation catalog. Persistent peers, teachers, mentors, caregivers, coworkers, and later contacts are ordinary stable people in ordinary organization/life context. Friendship, conflict, recognition, and mentorship arise from interaction, event, knowledge, memory, appraisal, and context history rather than a relationship score or mentor entity. A situation may create non-applying development evidence only after repeated relevant history; it never hard-sets adult personality from a single choice.

Adult education/training, volunteer work, ordinary employment, apprenticeship, Guard/Reserve service, activation/return, and relocation compose stable organizations, enrollment states, work statuses/roles, commitments, households, and ordinary historical records. Teen work and other sensitive actions consume the injected eligibility provider rather than encoding a universal age or territory rule. Enrollment completion state is the current canonical outcome seam; no credential database is introduced.

Consequence: Run B adds no Run C resource/compensation/housing/debt/relationship-integration system, Stage 6 generalized prerequisite/chain engine, Stage 7 law/institution/territory implementation, foreign-government simulation, organization hierarchy, population-scale rosters, or polished player UI.

Consequence: a person can accumulate school, participation, and child-authority history that remains stable across organization renames, transfers, later materialization, backdated append, subjective reasoning, and persistence without duplicating biography or stealing gameplay and law work from later runs.

## D-040 — Personal resource flows, housing identity, and relationship effort compose canonical life history

- Date: 2026-08-23
- Status: ACCEPTED
- Supersedes: none

Implement D-025's compatible flow vocabulary for the bounded personal/household domain, not as one universal finance object. A `ResourceFlow` has typed person, household, or organization endpoints; a stable basis and optional restriction; jurisdiction context where relevant; and append-oriented effective terms containing exact amount and cadence. Canonical money is a safe integer count of minor units plus a validated three-letter currency identity, never floating-point dollars. Expected terms, active/ended terms, and completed/partial/missed/blocked transfer outcomes remain distinct; cadence never silently creates a transfer.

Effective compensation is a flow linked to one canonical paid or mixed `WorkRelationship`. It does not replace work status or role history, cannot make unpaid work paid, and creates income only when a pay period is explicitly resolved. A stable opening resource position plus committed actual outcomes derives historical liquid position without arbitrary balance mutation or double-counting. Stable obligations distinguish housing, care/support, debt, and other open bases from actual payment outcomes. Debt is bounded to principal and payment history; structured affordability explains available, strained, or blocked capacity using exact liquid evidence and active major obligations. Accounts, purchases, interest products, credit scores/reports, tax, insurance, bankruptcy, investments, and full banking remain deferred.

A stable `Dwelling` is separate from household identity/location, occupancy, and tenure. Person or household occupancy has effective primary/secondary/shared history and implies neither lease nor ownership. Person, household, or organization tenure has independent lease, ownership, assignment, hosting, or other open semantics and implies neither residence nor household membership. Moving does not recreate a household; ownership does not force occupancy; assigned housing uses the same primitives. Care responsibility remains structural truth, while care costs and cross-household support use ordinary flows and obligations and infer no care, kinship, partnership, child authority, or co-residence.

Meaningful relationship contact, shared activity, support, missed opportunity, and reconnection compose existing time commitments, historical events, interactions, knowledge, memories, and appraisals. Any continuity assessment is qualitative and derived from evidence; there is no upkeep counter, closeness score, monthly decay, relationship deletion, or automatic hostility from inactivity. An explicit resource outcome may become actor-relevant typed life evidence for knowledge, appraisal, a bounded temporary resource-pressure state, perception, and decision explanation; there is no universal financial-stress, happiness, or wellbeing field.

Run C expands the finite typed Stage 4 life-source families and the one played/quick/authored `CharacterHistoryPlan` transition boundary. Date plus exclusive append sequence controls historical availability. Orchestration-only stable-key references are stripped before canonical writer input; this is a contained retroactive correction to D-039's already-declared plan-only boundary, not a record migration. Legacy `PersonFact` precedence, nondiegetic person materialization, stable open jurisdiction identity, and territory compatibility remain unchanged.

Consequence: Stage 5 is complete with one durable life graph spanning formative context, education, work, family/care, resources, obligations, housing, relationship effort, and subjective consequences. Campaign, organization, and government finance; Stage 6 generalized events, economy, metrics, and shocks; Stage 7 mutable law/institutions and territory-specific data; foreign-government simulation; property markets; and polished player UI remain explicitly deferred.

## D-041 — Cadence-safe capacity and period-bound resource settlement

- Date: 2026-08-23
- Status: ACCEPTED
- Supersedes: none; contained correction/clarification to D-040 settlement and capacity semantics

Affordability remains a derived, structured capacity assessment over exact liquid position and active major obligations. It must preserve obligation amounts in validated open cadence buckets and may derive strain only from a caller-supplied exact cadence comparison bucket. Different cadence keys are not normalized, parsed, or summed into one money amount.

For each `ResourceFlow`, committed outcomes own inclusive settlement intervals and no two outcomes may duplicate or overlap an interval. Completed, partial, missed, and blocked are each the sole bounded canonical outcome for their period; there is no replacement, retry, collection, or correction ledger in Stage 5. Writer and persisted-world integrity enforce this rule before balances can be double-counted.

Settlement validates terms effective at the settled period start, while the actual occurrence may remain on or after its end. If a later terms record becomes effective after the period start through that period end, the period is rejected as unprorated ambiguity rather than silently selecting old or new terms. This applies to general flow outcomes and the work-compensation convenience path.

Consequence: D-040 continues to provide bounded exact personal/household flow history without an automatic billing scheduler, cadence conversion scheme, payroll proration engine, banking or accounting model, Stage 6 event/economy implementation, Stage 7 law content, or UI.

## D-042 — Quantitative truth, observation vintages, and future transitions remain distinct

- Date: 2026-08-24
- Status: ACCEPTED
- Supersedes: none

Represent exact non-money quantitative values as canonical reduced safe-integer rationals with validated open namespaced units. Keep Stage 5 integer-minor-unit `MoneyAmount` separate, and let a closed metric-value union distinguish quantity from money. Store stable metric definitions in a world catalog with scope, stock/flow/rate/index nature, explicit point/interval period form, and aggregation limitations rather than adding one `World` property per metric or parsing Stage 3 proposition strings.

Represent canonical quantitative world truth as append-oriented metric-state history and source-specific measurement/public-statistic vintages as a separate append-oriented observation history. Corrections and revisions explicitly supersede matching prior records without mutation and may not have an earlier recording date than their same-series predecessor; same-date order remains the global append sequence. Competing observation series remain distinct; uncertainty is exact and dimensionally compatible; and date plus exclusive append sequence controls availability. Truth and observations create no automatic person knowledge. An explicit ordinary release event plus existing event-knowledge provenance is the bridge into subjective information.

Use one stable future due-item identity with the closed runtime/persisted scheduled/resolved/cancelled/blocked state vocabulary and canonical entity references, not opaque payloads, recurrence expressions, or duplicated domain truth. Nonserialized deterministic handlers resolve open transition keys. The authoritative `advanceWorld` path preflights and processes due-today plus later crossed items by due date then creation sequence, fails atomically for missing/failing handlers, and commits ordinary outcome history exactly once where applicable. At a committed or loaded frontier, a latest scheduled item due on the current date is valid pending work, but one strictly before current world time is invalid. A due-today item must resolve before authoritative time advances later. Handlers retain ordinary full-integrity canonical writers and may schedule later follow-ons, while existing due history remains append-only and cannot be rewritten by a handler.

Consequence: Stage 6 Run A supplies exact quantitative state, fallible observation, and future-transition foundations only. Economy/effect mechanics and derived formulas remain Run B; policy forecasts/implementation remain Run C; generalized incident/event selection and chains remain Run D; mortality/incapacity/evidence remain Run E. Mutable law/institutions/elections, territory-specific data, media ecology, campaigns/governing, foreign-government simulation, and player-facing UI remain later-stage work. Stable jurisdiction identity remains open and contains no 50-state assumption.

## D-043 — Causal provenance, typed effects, and bounded aggregate economy remain compositional

- Date: 2026-08-24
- Status: ACCEPTED
- Supersedes: none

Represent causal attribution as stable append-oriented `CausalProcessRecord` history that cites already-available canonical sources and optional earlier causal parents. It is provenance rather than a second narrative event store: meaningful occurrences remain `HistoricalEvent`. Causal ancestry is acyclic, date-plus-exclusive-sequence available, and queryable to sorted distinct root identities, so multiple effects of one root remain correlated while independent roots targeting the same metric remain distinct.

Store reusable effect response semantics in a small world catalog and committed cause-to-metric relationships as separate `EffectActivationRecord` history. Run B supports only exact linear and bounded ease-out response curves with typed magnitude/direction, a durable typed magnitude basis, onset/ramp/maturity/end, optional compatible threshold and target bound, open realization key, and stable metric/scope identity. A point-target magnitude has the `point-at-target` basis and phases at the historical target point. An interval-target magnitude has the `interval-total` basis with one exact persisted interval and may contribute only to that exact interval; no cadence label, inferred month/year conversion, or implicit rate is accepted. It adds no equation DSL, serialized callback, arbitrary payload, or silent field mutation. Evaluation is explicit and inspectable: `evaluatedAt` is only the cutoff/recording frontier, never the causal phase date. Interval phase samples the earlier inclusive midpoint of its target interval; it is zero when that point is before onset or at/after exclusive expiry, ramps or matures according to that point, and deliberately does not integrate an unmodeled continuous economy. Only the contained `recordEvaluatedMetricState` seam may commit a result through the existing metric writer, with the baseline and contributing activation IDs preserved as provenance.

Mark metric definitions as primitive or derived and reject independent writes to derived definitions. Canonical aggregate primitives include the minimum resident/labor/employment, nominal income/cost, consumption/output/housing-pressure, and revenue/outlays/debt state needed for Run B. Unemployment count/rate, real-purchasing-power-style capacity, and fiscal balance are exact queries retaining source-state IDs. Labor identities reject impossible counts and missing denominators; fiscal balance requires matching jurisdiction/segment, interval, and currency. Stage 5 personal/household flows and positions remain authoritative for concrete personal money, and Run B creates no people, firms, government accounts, appropriations, tax law, organization accounting, or continuous economy tick.

Causal/economic truth remains non-omniscient and uses Run A observation plus ordinary release/knowledge history when a person learns it. The Run A due-item mechanism remains the only future-transition seam; Run B adds no scheduler or recurrence. World schema 11, generator `demo-world-v11`, metric catalog v2, causal-mechanism catalog v1, and snapshot format 10 persist the new definitions and two global-sequence history families; person materializer remains v4.

Consequence: Run C policy baselines/operations may consume the same causal/effect substrate, Run D incidents may create the same causal identities and activations, and later reasoning can deduplicate shared roots without replacing Run B records. Policy/law, incidents/crises, mortality/incapacity/evidence, institutions/elections/campaigns/media, detailed government finance, national macroeconomics, territory-specific data, foreign-government simulation, and player-facing UI remain deferred to their owning runs/stages.

## D-044 — Quantitative policy freezes baselines and requires explicit implementation

- Date: 2026-08-24
- Status: ACCEPTED
- Supersedes: none

Represent a quantitative proposal/intervention as a stable generic `PolicyAlternativeRecord`, optionally linked to descriptive proposition metadata but never derived by parsing its text. Represent its behavior as one or more immutable `PolicyOperationRecord` records, each targeting one existing primitive metric, stable jurisdiction/optional-segment scope, explicit point or interval period, and exact named baseline. The closed operation family is set-level, absolute change, relative change, share of a named baseline, cap, and floor with an optional exact typed trigger; quantities and money retain the accepted exact unit/currency contracts. Multiple jurisdictions require explicit scoped operations, with no universal national scope or 50-state assumption.

Treat `PolicyBaselineRecord` as append-oriented dated counterfactual/forecast history, not observation or canonical metric truth. It freezes exact expected value, source frontier, methodology, assumptions, uncertainty, provenance, period, scope, and series predecessor. `PolicyEstimateRecord` freezes baseline-versus-alternative consequences and a shared projected Run B causal root under one separately inspectable implementation profile. Forecast creation never creates an actual effect activation or metric state, and later reality, revision, or backfill cannot rewrite or leak into an earlier date-plus-exclusive-sequence view.

Keep authority/eligibility, funding/resources, administrative capacity/setup, enforcement/compliance, and uptake/participation as five distinct bounded exact factors with evidence and reasons. The only aggregate implementation rule is their exact multiplicative product; authority is allowed or blocked, while funding and capacity may derive capped exact resource-coverage ratios. This is synthetic/injected evidence until later authoritative institution and law producers exist, not one implementation, feasibility, political-opinion, or utility score.

Require a separate `PolicyRealizationRecord` before actual consequences exist. Blocked or untriggered realization creates no actual cause/effect. Full or partial realization creates exactly one actual Run B causal process whose sole parent is the estimate's projected root and whose sole source/provenance source is that estimate; each consequence is the exact operation-derived Run B activation with its target, sign, absolute exact magnitude, point-target or exact interval-total basis, mechanism, timing, kind, null threshold/bound, source, and recording date. One alternative may have at most one full/partial realization. An estimate superseded in its own series cannot be newly scheduled or realized, although a realization committed before a later revision remains history. Canonical metric truth remains a later explicit baseline-plus-effect write. Delayed realization reuses the one Run A due-item handler seam: exactly one due item references exactly one available estimate, is due at the earliest operation start, carries the shared operation jurisdiction only when all operations share it (otherwise `null`), and cannot remain pending after realization. Scheduling validity is reconstructed at the due item's own append sequence: its estimate must then be current in its series and, when that estimate would produce effects, no earlier full/partial realization may already have implemented its alternative. Thus fabricated generic or persisted impossible schedules reject, while later history may make a valid historical schedule obsolete without corrupting it. At the due frontier, a superseded estimate or already-implemented alternative terminally cancels with a typed reason, never substitutes a replacement estimate or creates a second effect, so generic time advancement can cross the frontier. It adds no recurrence or scheduler.

Policy truth and forecasts grant no subjective access automatically. A policy analysis becomes available to one actor only through an ordinary event and event-knowledge record; the bounded decision adapter consumes that actor's knowledge plus caller-supplied value/goal/belief/feasibility interpretation through Stage 4 and never maps magnitude directly to ideology. World schema 12, generator `demo-world-v12`, snapshot 11, metric catalog v2, causal catalog v1, and materializer v4 persist this boundary.

Consequence: Run C adds no law/statute identity, legislative or executive authority model, office/agency, appropriation/tax/budget process, automatic forecast generator, public-opinion penalty, media ecology, generalized incident chain, mortality/evidence, territory data pack, foreign-government simulation, or player-facing UI. Run D generalized incidents is the next Stage 6 boundary; Stage 7 and later governing systems may become authoritative producers without replacing Run C policy records.

## D-045 — Generalized incidents are explicit, causal, and append-oriented

- Date: 2026-08-24
- Status: ACCEPTED
- Supersedes: none

Represent a possible shock, condition, hazard, or actor-initiated civic occurrence as a JSON-safe stable `IncidentDefinition` in one catalog, not as historical truth. Definitions retain an open kind/category and tags, a closed occurrence mode, exact base likelihood, a deliberately small typed rule family, and bounded typed likelihood modifiers. The first rules are exact Run A metric comparisons, ordinary historical-event availability, and another definition's incident state; no string parser, callback, formula language, or hidden storyteller tick is allowed. Explicit evaluation returns every prerequisite/blocker result, exact likelihood/modifier evidence, exact exposure/vulnerability/resilience inputs, bounded impact share, keyed deterministic RNG evidence where applicable, and the occurrence decision. A missing metric is unavailable/ineligible rather than zero.

For a probabilistic definition, derive the non-consuming keyed `SeededRng` evaluation identity from the world seed, definition key, caller evaluation key, scope, evaluation date, and historical cutoff. Compare an integer draw to the exact bounded `rate:share` likelihood without canonical floating-point probability. Occurrence likelihood remains distinct from consequence impact. The first accepted impact rule is exactly `exposure × vulnerability × (1 − resilience)`; each factor is independently inspectable and the resulting share may scale a typed consequence but cannot alter whether the hazard was eligible or rolled.

Commit one successful occurrence atomically as an ordinary `incident.occurred` historical event, one root `incident:occurrence` causal process, immutable `IncidentRecord` evaluated-risk snapshot, ordinary meaningful onset/phase event and append-only `IncidentStateRecord`, and ordinary Run B effect activations. Definitions are reusable and never history; historical events remain the canonical statement that something happened. An incident owns one durable root throughout its state history. An immediate effect cites the onset occurrence; a delayed transition effect cites its ordinary phase event; all use the accepted Run B target/scope/magnitude-basis/mechanism/timing/realization contracts. Policy and incident activations may target the same metric, but separate roots remain separate and existing root deduplication handles one incident's correlated branches.

Represent delayed escalation, response, recovery, or end as an append-oriented `IncidentTransitionPlanRecord`, then schedule exactly one existing Run A due item that names that plan. At creation, integrity reconstructs plan availability, active incident state, matching due date, scope and provenance, and one-plan/one-due identity. At the due frontier normal handling commits one ordinary phase event and one superseding incident state exactly once. A plan that later becomes obsolete because the incident is already resolved or advanced remains valid historical scheduling evidence and terminally cancels with a typed reason rather than deadlocking generic time advancement. It never silently substitutes another plan, adds recurrence, or rewrites history.

Incident truth grants no knowledge. Existing ordinary event-knowledge provenance is the only Run D subjective bridge. Queries use date plus exclusive global sequence for incident identity/state/active/definition/kind/root/event history. World schema 13, generator `demo-world-v13`, snapshot 12, and incident catalog v1 persist the catalog and the three incident history families; metric catalog v2, causal catalog v1, and materializer v4 remain unchanged.

Consequence: Run D introduces no weather simulator, full health/disease model, mortality/incapacity/evidence/discovery system, media, public opinion, recurrence, macroeconomic tick, law/institutions, elections/campaigns, budgets/taxes, territory-specific content, foreign government, tactical conflict engine, or player-facing UI. Run E owns mortality/incapacity/evidence; later systems consume the ordinary event and causal records rather than replacing them.
