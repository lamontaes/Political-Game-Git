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

The public evaluator validates the world and delegates to one non-recursive canonical evaluation core. An occurrence writer and persistence integrity reconstruct that same core from the snapshot's definition, evaluation key, scope, date, exact cutoff, risk inputs, and unscaled consequence plans; the complete evaluated result must match exactly. This protects base/final likelihood, prerequisite/blocker results, modifier application/factors/sources, RNG key/draw/result, risk factors, scaled consequences, and occurred result without a second semantic implementation. An older same-day cutoff remains valid only when this exact reconstruction agrees; it is never silently refreshed to the current frontier.

Commit one successful occurrence atomically as an ordinary `incident.occurred` historical event, one root `incident:occurrence` causal process, immutable `IncidentRecord` evaluated-risk snapshot, ordinary meaningful onset/phase event and append-only `IncidentStateRecord`, and ordinary Run B effect activations. Definitions are reusable and never history; historical events remain the canonical statement that something happened. An incident owns one durable root throughout its state history. An immediate effect cites the onset occurrence; a delayed transition effect cites its ordinary phase event; all use the accepted Run B target/scope/magnitude-basis/mechanism/timing/realization contracts. Policy and incident activations may target the same metric, but separate roots remain separate and existing root deduplication handles one incident's correlated branches.

Represent delayed escalation, response, recovery, or end as an append-oriented `IncidentTransitionPlanRecord`, then schedule exactly one existing Run A due item that names that plan. At creation, integrity reconstructs the plan's source state as the latest state before the plan sequence and the active state as the latest state before the due-item sequence; both must be active and have the same ID, alongside matching date, scope and provenance, and one-plan/one-due identity. The domain writer refuses a plan whose source state has already been superseded. At the due frontier normal handling commits one ordinary phase event and one superseding incident state exactly once. A plan that was valid when scheduled but later becomes obsolete because the incident is already resolved or advanced remains valid historical scheduling evidence and terminally cancels with a typed reason rather than deadlocking generic time advancement. It never silently substitutes another plan, adds recurrence, or rewrites history.

Incident truth grants no knowledge. Existing ordinary event-knowledge provenance is the only Run D subjective bridge. Queries use date plus exclusive global sequence for incident identity/state/active/definition/kind/root/event history. World schema 13, generator `demo-world-v13`, snapshot 12, and incident catalog v1 persist the catalog and the three incident history families; metric catalog v2, causal catalog v1, and materializer v4 remain unchanged.

Consequence: Run D introduces no weather simulator, full health/disease model, mortality/incapacity/evidence/discovery system, media, public opinion, recurrence, macroeconomic tick, law/institutions, elections/campaigns, budgets/taxes, territory-specific content, foreign government, tactical conflict engine, or player-facing UI. Run E owns mortality/incapacity/evidence; later systems consume the ordinary event and causal records rather than replacing them.

## D-046 — Vitality, functional capacity, and objective evidence remain explicit history

- Date: 2026-08-24
- Status: ACCEPTED
- Supersedes: none

Represent individual mortality only for explicitly scheduled materialized people. Store stable mortality-table definitions in a versioned world catalog with explicit integer-age entries and exact bounded `rate:share` annual probabilities; there is no interpolation, sex/race/health dimension, or asserted real-world actuarial source in the synthetic validation tables. One canonical mortality plan snapshots person, table, birthday/check year, exact age and probability, recording date, provenance, and global sequence. It schedules exactly one ordinary Run A due item through the existing scheduler. Checks occur on the deterministic birthday boundary, including February 28 for a February 29 birth in a non-leap year, at their exact Run A due-order frontier; there is no daily roll, recurrence language, automatic materialization, or population scan.

Evaluate a plan through non-consuming `SeededRng` identity keyed by world seed, person, table identity, check year/date, and age, then compare the integer draw to the exact probability. Persist one reconstructible result. Survival schedules exactly one explicit next-year plan when the same table has that next-age entry, and no follow-on when it does not. A handler checkpoint before Run A appends the terminal due state remains idempotently resumable without reroll or duplication. Death writes an ordinary `person.died` event, one durable death record, and exact result links; a mortality-caused death cannot exist without that exact died result. Birth implies the initial living boundary and no mutable `alive` flag is added. A valid pending plan made obsolete by another canonical death terminally cancels at its due frontier with exact canonical terminal metadata and cannot produce a result. Person identity and all prior relationship, work, resource, information, policy, and incident history survive death; no relationship cleanup, estate, probate, inheritance, or automatic resource transfer occurs.

Represent functional capacity through append-only capable/limited/incapacitated history linked to ordinary capacity-change events and exact supersession. A living person defaults to capable before the first transition. Date plus exclusive append sequence controls vitality and capacity queries, so later-recorded backfill does not leak. The common life-eligibility boundary blocks deceased and incapacitated actors with structured `capacity:*` reasons, while limited status remains allowed for domain-specific interpretation. A Run D actor-initiated occurrence requires exactly one actor and reuses the same availability rule, so omitting actor identity cannot bypass it; generic historical writing about a deceased person remains valid.

Represent objective evidence as stable append-oriented artifacts with an open kind, creation/recording dates, already-available ordinary event or incident truth, a closed public/restricted/private/sealed access classification, optional short context, provenance, and global sequence. Access is metadata, not an ACL or probability of awareness. Artifact creation grants nobody knowledge. Discovery is explicit and atomic: one private ordinary `evidence.discovered` event, one person/artifact discovery record, and one exact direct event-knowledge record for that person about the encounter. It neither teaches another person nor grants knowledge of every source event. Created/discovered date plus exclusive append sequence governs queries and backfill.

World schema 14, generator `demo-world-v14`, snapshot 13, and vitality catalog v1 persist the new catalog and six history families through exact JSON and Node-only SQLite; incident v1, metric v2, causal v1, and materializer v4 remain unchanged. The permanent maximum-current contract is one continuous Stage 5 through Run E history including Stage 4 subjective state, Run A truth/observation/time, Run B causal economy, Run C policy, Run D incidents, capacity/recovery, one-person evidence discovery, deterministic mortality/death, preserved post-death identity/resources, and exact JSON/SQLite replay.

Consequence: the conceptual Stage 6 implementation milestone is complete, pending external repository audit. Run E adds no medical/disease simulator, health score, population-wide mortality, investigation/search/chain-of-custody system, media/public-opinion ecology, estate/inheritance law, institution/office/law/authority model, territory-specific content, second scheduler, or player-facing Stage 6.5 UI.

## D-047 — Player presentation is filtered, inspectorial, and separate from world state

- Date: 2026-08-26
- Status: ACCEPTED
- Supersedes: the Stage 6.5 hold only for the bounded authorized Run A slice;
  no Stage 6 decision is superseded

Make the deterministic political-office scene the normal browser entry point
and retain the omniscient diagnostic viewer only at `?view=developer`. The
player scene is not a restyled diagnostic dashboard. It composes one bounded
synthetic person, office event, relationship interaction, scene anchor, seated
pose, live shell, contextual menu, dossier, and civic-learning example. The
fixture role, clock, and geometry are presentation context and establish no
Stage 7 institution, office authority, law, calendar, or legislation system.

Place the epistemic selector and interaction reducer in a React-independent
presentation layer. A dossier field must be justified as personally known,
institutionally accessible, publicly discoverable, reported, inferred and
uncertain, or unknown. These are qualitative access classes, never numeric
meters. Canonical existence grants no player access: the Run A fixture's private
belief remains absent while its public statement remains eligible. Person
selection, Inspect, dossier reading/closing, navigation, pin sizing, civic help,
and learning state never invoke a simulation transition, append history,
consume RNG, or advance the canonical date/action sequence.

Store only the allowlisted learned concept in a versioned Stage 6.5 browser
record. Opening help does not learn it; an explicit button or Shift + left click
does, with a keyboard-equivalent control. Keep manual pin size authoritative
over later automatic importance sizing for the session. Browser state is not a
world snapshot and does not relax strict unsupported-version rejection.

Accept the four project-owner-supplied 2026-08-26 images as visual/composition
authority only: warm semi-illustrated office, scene-first depth, correct desk
occlusion, compact navy/gold bottom-left plaque, and narrow mixed-density right
tray. Their rights remain unknown, their measurements are visual estimates,
and their raster bytes are not repository assets. Dynamic UI remains authored
React/CSS/text. Playwright is the one new focused development dependency and
must prove the bounded player flows with useful failure evidence. Stage 6 stays
frozen and Stage 7 stays gated.

## D-048 — Scene-native conversation composes canonical history without a second world model

- Date: 2026-08-26
- Status: ACCEPTED
- Supersedes: the Stage 6.5 hold only for the bounded authorized Run B slice;
  no Stage 6 decision is superseded

Add the first bounded player-facing conversation through the accepted office
scene rather than a full-screen dialogue mode. A controlled person, two visible
NPCs, and explicit presentation-owned room presence distinguish physical
presence, active participation, current addressee, and resolved listener.
Addressee and the closed Normal/Quiet/Private interaction mode are separate;
Private remains unavailable when another person is plausibly within earshot.
This is a deterministic room contract, not distance acoustics or a universal
spatial simulation.

Keep one immutable `World` owned by the player session and keep conversation UI
state separate. Opening, closing, collapsing, changing addressee or audibility,
and reading the transcript do not write history or move time. A substantive
turn uses a stable key derived from scene, starting history frontier,
participants, session, and local committed-turn ordinal. It may immediately
record an NPC-only durable decision trace, then composes the existing ordinary
event, claim, direct/told-by knowledge, heard-claim perception, and qualitative
relationship writers. Claim occurrence remains distinct from truth and casual
speech does not rewrite private belief, public position, or campaign promise.

Conversation turns stay on `World.currentDate`; same-day causality uses the
global history sequence and never `World.actionSequence`, fabricated minutes,
or a sub-day clock. Authored phrase families translate bounded semantic results
into deterministic dialogue without runtime AI or network access. A contained
Stage 6 integrity correction orders the already-supported heard-claim source
pair canonically so the public writer and persisted-world validator agree; it
changes no record shape, vocabulary, or intended semantic rule.

The existing right pin rail generalizes presentation-only person pins to both
visible NPCs with deterministic order and deduplication. Pin activation opens
explicit Compact/Standard/Expanded controls rather than silently cycling; a
person pin also exposes an accessible Unpin action. Manual size remains
authoritative, unpin removes only that person and clears stale manual size, and
current/scheduled context stays in place. The compact conversation header names
the synthetic controlled person as `You — Cameron Foster` and states the
constituent-services problem before intent selection: two county referrals
lacked a required proof-of-income form, Reed is checking the third, and Collins
must decide whether to back a staff document checklist. Authored responses
use the topic, addressee, intent, prior bounded turn, and semantic outcome.
Listen is a non-spoken action whose availability derives from fixture-specific
pending contributions rather than a universal turn cap. Collins and Reed may
contribute sequentially; one empty beat may settle the room, after which empty
duplicates reject until a later player action creates a new follow-up. A small
progression record preserves the briefing subject, support/verification state,
latest proposition, pending contributions, and phase across addressee changes.
The current resolved listener set also gates a pending speaker: Quiet-to-Reed
preserves an unheard Collins contribution without response or canonical
consequences, while the same state under Normal may resolve it exactly once.
Active conversation has no desktop internal scrollbar; paged history reuses
the same bounded box rather than appending beneath active interaction.
Temporary navigation, pin, and person-action menus dismiss on click-away or
Escape without applying that rule to substantive conversation.

Consequence: Run B proves that people present in a scene can hear, respond,
decide, learn claims, and affect relationship history without a detached RPG
dialogue tree. It adds no universal dialogue language, acoustic engine,
calendar, legislation workspace, institution/law/authority model, Run C or Run
D scope, or Stage 7 feature.

## D-049 — Legislative working documents project existing policy semantics without becoming law

- Date: 2026-08-27
- Status: ACCEPTED
- Supersedes: the Stage 6.5 hold only for the bounded authorized Run C slice;
  no Stage 6 policy or future Stage 7 law/institution decision is superseded

Represent the first player-facing legislative work as one presentation-owned
office working document, not a canonical bill, statute, chamber action,
appropriation, or procedure record family. Deterministic document, provision,
variant, annotation, and selection identities live in `src/presentation/`.
Each quantitative variant stores explicit canonical links to an existing Stage
6 `PolicyAlternativeRecord`, `PolicyOperationRecord`, and
`PolicyEstimateRecord`; rendered legal prose is never parsed to infer
quantitative behavior. The Transit Access Pilot fixture maps the current
$8,000,000 phrase and prepared $4,000,000 phrase to distinct absolute increases
in `government.outlays`, both scoped to the same Lexington jurisdiction and
`transit.pilot-eligible-riders` segment for the same interval.

Keep current legal text, Collins's working annotation, staff interpretation,
prepared alternate text, and compare markup as separate presentation concepts.
Document selection, clean/annotated display, and compare never write World.
Policy estimates remain forecasts: they create no realization, effect
activation, or metric truth. Cameron sees an interpretation only after the
existing `recordPolicyAnalysisKnowledge()` path creates ordinary person-owned
review knowledge. An additional canonical sensitivity estimate deliberately
remains absent from the projection and DOM because Cameron never learns it.

Derive the current office working variant from one exact duplicate-safe
`office.working-draft-revised` historical event linking the controlled player,
jurisdiction, both alternatives, and both operations. The event records a
same-date office drafting instruction and leaves `currentDate`,
`World.actionSequence`, policy realization, effect activation, and metric truth
unchanged. It does not enact, introduce, pass, appropriate, or implement
anything. Later law, institution, legislation, budget, and procedure systems
must attach authoritative identities and acts without replacing this provision
bridge or the accepted Stage 6 policy/effect backend.

Extend the accepted Run B conversation progress with one discriminated
legislative-provision subject. Its authored Collins response requires Collins's
own policy-analysis knowledge and then uses the existing room, addressee,
audibility, listener, ordinary event, unknown-truth claim, direct/told-by
knowledge, and heard-claim perception commit path. No second legislation
conversation engine or casework copy enters this subject.

Consequence: Run C proves physical document → legal phrase → stable provision →
known staff analysis → prepared quantitative alternative → provision
discussion → office-draft instruction while preserving scene-first
presentation and proposal-versus-implementation truth. It adds no formal
officeholding, bill/law identity, sponsorship, chamber, committee, vote,
passage, enactment, appropriation, calendar, sub-day clock, Run D surface, or
Stage 7 system.

## D-050 — Canonical zoned minute time owns exact agenda and work progression

- Date: 2026-08-27
- Status: ACCEPTED
- Supersedes: the Stage 6.5 calendar hold only for the bounded authorized
  Run D-Lite slice; no Stage 6 future-transition or Stage 5 load decision is
  superseded

Advance World to schema 15 and snapshot format 14 with one canonical
`SimulationMoment`: `IsoDate`, integer minute of day, IANA-style timezone
identity, and explicit UTC offset. The zone retains geographic context while
the explicit offset makes instant comparison and replay independent of host
timezone data. `currentDate` must equal the moment date. Whole-day advancement
preserves local minute, zone, and offset; exact-minute advancement updates both
date forms across midnight and invokes the existing date-level future-due
frontier. `FutureDueItem` remains date-level. Global history sequence and
`World.actionSequence` remain append order and seeded-action input,
respectively; neither becomes elapsed time.

Represent agenda commitments with immutable scheduled-activity roots and
append-oriented exact state. Roots own participants, responsible person,
authored location, source identities, access, kind, and fixed or bounded
movable flexibility. State owns start/end moments, lifecycle, change,
supersession, and an optional ordinary outcome event. Shared-participant
half-open interval overlap is invalid. Fixed and travel commitments never move
silently; a flexible block moves only through an explicit valid reschedule. A
rejected reschedule returns its deterministic reason and exact unchanged World.
Travel is a real fixed interval, not descriptive padding.

Represent office work with immutable roots and append-oriented state. Roots own
real source identities, jurisdiction, access, a person/legislative-material/
calendar/other focus target, and optional authored effort. State owns
assignees, controlled-player decision/action/none requirement, waiting people,
blocker, elapsed effort, calendar linkage, lifecycle, outcome, and
supersession. Needs you, Waiting on others, Staff handling, and Completed /
ready to review are projections from those semantics, never stored buckets.
During canonical elapsed time, assigned staff progress only when not occupied
by overlapping commitments; exact authored completion appends one state and
ordinary event and cannot duplicate.

Keep Calendar and Work/Pending presentation-owned as access-filtered planning
projections over canonical truth. Their reducer stores only open/inspection and
feedback state. Opening or inspecting them consumes no time. A declared
meaningful activity cost uses the simulation transition. Private NPC schedule
and work remain omitted. Manual pins remain deliberate references and are not
auto-populated or overridden by system status.

Consequence: later campaign, constituent, legislative, staff, public-event,
governing, and authored-travel systems may reuse one exact schedule/work/time
substrate. D-Lite adds no recurrence, routing, staff economy, campaign,
election, electorate, law, institution, procedure, or Lexington Slice E system.

## D-051 — D-Lite acceptance repair makes elapsed time, commitment boundaries, zones, and pins truthful

- Date: 2026-08-27
- Status: ACCEPTED
- Supersedes: D-050 only where it described an IANA-style regex identity,
  preserved a stale offset across whole-day advancement, or allowed generic
  minute movement through unresolved controlled-person commitments; no record
  family or later-stage scope decision is superseded

A canonical `SimulationMoment` must name a timezone supported by the runtime's
IANA data, and its local date, minute, and explicit offset must all represent
the same instant in that zone. Exact-minute addition advances the represented
instant and derives the resulting local date, minute, and offset. Whole-day
advancement preserves the intended local clock and zone while resolving the
offset valid on the target date. An ambiguous local time prefers the previous
offset when valid and otherwise the earlier represented instant; a nonexistent
local time rejects rather than fabricating a clock reading.

Generic minute advancement stops before crossing the start of any unresolved
scheduled activity involving the controlled person and returns the exact input
World. Explicit scheduled-activity performance may consume its own pre-start
wait and interval, but cannot jump through an earlier unresolved controlled
commitment or travel block. D-Lite adds no lateness, missed-appointment, or
automatic cancellation system.

Player-facing action disclosure must equal the canonical transition. The
9:10-to-10:15 briefing path therefore states 20 minutes waiting plus 45 minutes
attending and 65 total elapsed minutes before confirmation. The bottom-left
civic-glass shell rests as a compact translucent chip and expands through a
forgiving pointer approach zone, focus, or activation; touch activation uses
the same open state and reduced motion removes transition animation.

`Pinned` contains only deliberate user-controlled references. Canonical next
commitment is a separate status projection derived from `nextCommitment`.
Every remaining person pin has an Unpin action and a scene-native re-pin route;
the unsupported District Notes fixture is removed. Selecting a manual pin size
persists it and closes the controls in the same reducer action.

Consequence: this is a correctness and human-play repair to the existing
D-Lite substrate. It adds no Slice E, campaign, election, governing, law,
institution, procedure, routing, generalized multi-zone travel, or pin
organization feature.

## D-052 — D-Lite scheduled execution is activity-generic and canonically continuous

- Date: 2026-08-27
- Status: ACCEPTED
- Supersedes: the briefing-specific Calendar/`PlayerOffice` execution adapter
  described by the initial D-Lite implementation; no D-050/D-051 simulation,
  travel, rescheduling, time-zone, work, or scope contract is superseded

Project canonical performance timing for every future visible scheduled
activity for which the controlled person is responsible. The projection owns
no new truth: it reads the existing wait, activity duration, resulting moment,
and earlier controlled-person blockers from the D-050/D-051 simulation API.
Presentation maps the existing activity kind to the bounded player verbs Work,
Travel, Attend, or Begin and submits the selected activity ID through the one
`performScheduledActivity` transition. It does not special-case
`briefingActivityId`, create a React clock, or store an activity status.

`PlayerOffice` remains the sole mutable World owner and replaces its World only
after canonical performance succeeds. Blocked later execution returns the
exact input World and reports the earlier commitment or travel interval.
Terminal activities project no performance action, so they cannot repeat.
After every success, current moment, Calendar activity status, Next Commitment,
Work/Pending, and staff progress rederive from the returned World.

Consequence: the representative day continues deterministically from 9:10
through briefing, flexible work, required travel, and the later community
meeting. This repair adds no missed-appointment state, autonomous planning,
Calendar redesign, recurrence, routing, Slice E, generated-person behavior, or
Stage 7/8/9 system.

## D-053 — Characters are composed deterministically from reusable components

- Date: 2026-09-01
- Status: ACCEPTED
- Supersedes: the "asset-substitution pass" language in the Stage 6.5 art and
  presentation documents only where it implied that every final character is
  one flattened raster; no D-047 identity, anchor, release-gate, or fail-closed
  decision is superseded

The "asset-substitution pass" recorded after PR #13 convergence described how
the temporary A01/B01 development fixtures would be retired. It never
authorized a permanent one-image-per-person character pipeline, and it is not
authority for one. The current direction is modular deterministic character
composition:

- The canonical person owns a stable appearance identity
  (`PersonAppearance.seed` and `recipeVersion`, D-047). Presentation resolves a
  pose-independent identity recipe from that seed through the repository
  `SeededRng` keyed forks (D-004), one fork per slot, so later slots never
  perturb earlier ones. No presentation code introduces a second hash or
  selection primitive.
- Reusable body, head, hair (front/back), facial-hair, eyewear, top, bottom,
  footwear, and accessory components are ordinary assets in the one existing
  art manifest, released through the existing approval, QA, hash, provenance,
  and runtime-release gate. An append-only character catalog ledger freezes
  each generation's membership and definitions by signature. An established
  identity pinned to a generation is reproducible after the library grows;
  release state affects rendering eligibility, never selection.
- Three anchor concepts stay distinct: a scene anchor owns where a character
  sits in a room, the pelvis-hip-center root owns where the rig meets the
  scene, and an attachment anchor owns where a component meets the rig.
  Attachment anchors are metadata on the body component and are never painted
  into imagery. The empty `attachmentSlots` placeholder is replaced by that
  typed contract.
- Generators such as Gemini, Firefly, or fit-and-extract tools are
  development-time asset producers recorded in provenance. Ordinary runtime
  code owns composition; no runtime depends on a generator, network, or model.
- No new rendering engine is authorized. The existing DOM scene camera,
  integer depth ordering, occluder, and transform contracts remain the
  compositor.

Consequence: the repository can represent, validate, and deterministically
resolve modular characters before any component art exists. This decision
implements no component art, generator, wardrobe library, normalization,
head-angle generation, animation, or replacement of the accepted office
characters; those remain separately gated. Canonical `Person` and `World`
semantics are unchanged.

## D-054 — The appearance catalog pin lives on the person-owned appearance record

- Date: 2026-09-01
- Status: ACCEPTED
- Supersedes: the D-053 statement that persisting a pinned generation was
  deferred; no identity, anchor, release-gate, or fail-closed decision is
  superseded

An established person must not change appearance when the game reloads,
another scene displays them, or later catalog generations add content. The
only information required to guarantee that under D-053's pure resolver is the
catalog generation the person is pinned to, so it is recorded as the optional
`PersonAppearance.catalogGeneration` on the existing person-owned appearance
record. It is an appearance pin, not biography, belief, or political truth:
the resolved families and components are never stored and are always derived.

The pin is set when a person is created, from a generation the creating caller
supplies; the simulation never reads the art manifest. Presentation reads the
pin and never writes it: rendering, inspection, scene placement, and the
developer proof do not mutate `World`. A person created before pinning existed
carries no pin, and presentation resolves them against the first generation,
which the ledger signature freezes, so legacy people are equally stable. World
integrity rejects a non-positive or non-integer pin. The snapshot format is
unchanged because the field is optional and additive.

The first running proof composes four generated people through one DOM
compositor from shared DEV/NON-PRODUCTION procedural components drawn by a
repository script, shows the first person again in a second scene, and
survives save and reload through the ordinary snapshot codec. The accepted
authored A01/B01 office path is untouched and coexists with the modular path.

Consequence: appearance stability is a property of the save, not of one
browser session. No production component art, generator, wardrobe library,
head-angle generation, animation, engine, office-scene consumption, Slice F,
or campaign/election change is authorized by this decision.

## D-055 — Real masters are normalized deterministically into the modular contract, and seated contact is measured

- Date: 2026-09-01
- Status: ACCEPTED
- Supersedes: the D-047 visual-estimate roots and anchors for the A01/B01
  recipes and the original primary-desk-worktop occluder polygon only; no
  identity, catalog, release-gate, or fail-closed decision is superseded

Owner-supplied Political Game masters — gray body-geometry authorities, bald
head/face identity masters, hair-only masters with a face opening, and
unfitted garment and footwear design masters — enter the runtime only through
`scripts/art-asset-factory/pg-modular-intake.ts`. The intake is deterministic
image processing: per-row neutral-background keying with optional
neutral-shadow suppression, opaque-bounds cropping, mask-derived body rig
measurement (crown, brow, neck, shoulder line, waist, crotch root, sole line),
fixed fit ratios against those measurements, hairline or neck-cut origins, and
Lanczos-3 resampling. No pixel is generated or repainted. Source masters are
copied byte-for-byte under `art/references/masters/pg-modular/` and every
derivative's provenance records the master path, master hash, keying profile,
crop, scale, and fit. A garment design master fitted to more than one body
family keeps one family identity and yields one derivative per body family;
context selects the derivative for the person's body.

Manifest records carry an `availability` class. `development-fixture`
components keep serving people; a `production-candidate` of a kind excludes
fixtures of that kind from selection at any generation where it exists AND is
released. The class lives on the record, not the definition, so generation
signatures are unchanged. The release half of that test is not decoration: a
candidate that has no drawable raster behind it would replace a person with a
placeholder.

The ordinary office seam now serves every person: an authored flattened
recipe still wins; otherwise `composeOfficeVisuals` builds a modular render
plan for the anchor's pose through the same compositor, and a missing body
for that pose fails closed to the placeholder. The scene code does not care
which path produced the character.

The visible seat-contact defect had two causes. The foreground occluder's
primary-desk-worktop polygon ran to the plate edge and swept through the
primary chair, painting the chair back and seat over the seated figure. Both
authored roots were declared mid-torso rather than on the seat plane, so the
figures sat a quarter of their height too low and beside their chairs. The
polygon now ends at the chair, and the roots are the seat-contact lines
measured from the rasters by `scripts/art-asset-factory/seated-contact.ts`;
the anchors are the chairs' seat points. A regression test measures both.

Consequence: four real people compose from two body families, five heads,
eight hairstyles, four tops, three bottoms, and three footwear designs, and
persist and reload unchanged. No real seated body exists, so the office cannot
yet seat a real modular person; no complexion-matched body base exists, so
exposed skin on modular bodies renders as the gray geometry authority; no
eyewear or accessory master exists locally. Those are asset requirements, not
architecture gaps, and are recorded rather than faked.

Amended by D-059: these thirty-five derivatives are banked candidates rather
than catalog components. Everything above about the intake, the provenance,
the seat-contact measurement and the occluder repair stands; what changed is
that the parts do not enter a catalog generation until a person has looked at
them.

## D-056 — Legislative procedure is rule-driven, and legislative voting is a record of members

- Date: 2026-09-01 (amended 2026-09-02 after independent audit)
- Status: ACCEPTED
- Supersedes: the `docs/systems/legislation.md` statement that legislation is
  not implemented, for the bounded scope built here only; no Stage 6 policy,
  election, time, or presentation decision is superseded

A measure moves through an institution, and the institution comes from data.
`src/simulation/legislature-rules.ts` defines a runtime rule contract covering
chamber structure, sessions, introduction, referral, committees, floor stages,
amendments, inter-chamber transit, executive presentment and veto, override
forum, and enactment. `src/simulation/legislature-rule-packs.ts` holds packs
compiled from the 50-state institutional research warehouse; every value cites
the constitution, chamber rule, uniform rule or statute it came from. The
engine holds no jurisdiction knowledge of its own, and a rule pack that
contradicts itself is rejected before play.

Three epistemic states never collapse into one another. `known` carries a
resolved rule and its source, including a resolved negative such as a committee
that may decline to hear a bill. `unknown` means no source settled it and is
not zero, none or absent. `not-applicable` means the institution has no such
concept, as with a second chamber in Nebraska. Reading an unknown rule and
reading a not-applicable rule raise different errors, so no caller can silently
treat one as the other, and the player surface says which is which.

Those states fail closed. Only a rule that is `known` and says yes authorises
an act: unknown and not-applicable both refuse, and a known negative refuses
too. That holds at the writer, in the steps the player is offered, and in
integrity checking alike, so a rule the research did not settle cannot be shown
as permission on one path and refused on another. Where a legislature applies a
heavier bar to money bills and that bar is unresolved, the ordinary bar is not
displayed or validated in its place; the player is told the heavier rule exists
and is not settled.

Source metadata is part of the simulation contract, not commentary. Each
chamber cites its own instrument — a House rule cannot establish Senate
procedure — and `verification` is a claim about evidence rather than a
constructor default: `verified` means the operative text of the cited section
was read, `partial` means the section is right but only a heading or official
summary was checked. Values a scenario needs but no source establishes, such as
how many members sit on a committee, are marked as the scenario's rather than
carried as institutional fact.

A measure's position is never stored. `LegislativeMeasureRecord` carries
identity; `LegislativeActionRecord` is the append-only log of consequential
transitions; where a bill sits is derived by replaying that log against its
rule pack. Every transition also writes an ordinary historical event, so the
institutional story lives in the same history as everything else and survives
save, reload and replay.

That replay is a state machine, not a reducer over the last action. Each action
must be legal from the state immediately before it; the chamber, committee and
floor stage it names must be the ones the measure is actually in; the rule that
authorises it must be `known`; and nothing at all may follow a terminal action.
`assertLegislationIntegrity` refuses a history that breaks any of those, so a
save cannot carry an impossible order of events, a bill cannot be both dead and
law, and a measure resolves exactly once. Being signed at some point in the
past is not standing authority to be enacted later: enactment is legal only
from the position where enactment is the next step.

Two chambers cannot send different texts to a governor. Where a second chamber
adopts an amendment, the measure returns to the chamber it started in for a
recorded vote on accepting that change; agreement leads to enrolment and
refusal ends the bill. A second chamber that passes the text unchanged goes
straight to enrolment. Conference between two chambers that will not agree
remains unimplemented.

Identity belongs to the saved world. Stable keys for new legislative records
are derived from the measure's own recorded history, never from a counter held
in a running process, so saving, reloading and carrying on produces the same
next key as never having left, and two bills played in parallel cannot take
each other's keys.

Legislative voting shares nothing with the election substrate. An election
resolves a contest through vote shares and tallies; a legislative question
either reaches a required number of votes or does not. `LegislativeVoteRecord`
records named members and their dispositions, the eligible membership, presence
where the record represents it, the threshold's fraction, its denominator
(members elected, members present, members voting, committee membership, or a
joint sitting's combined membership) and its rounding rule. A majority is
strictly more than half, so a majority of thirty-eight is twenty; three-fifths
of forty-nine takes at least the fraction, so it is thirty. Integrity
recomputes every tally, denominator and required count from the record's own
dispositions, so a snapshot cannot claim an outcome its members did not
produce.

How a member decides is out of scope. This slice authors member decisions per
scenario rather than inventing a legislator-behaviour model, and leaves a clean
seam for the researched relationship, bargaining and lobbying systems. No
step applies an unexplained numeric modifier to any tally.

Legislative activity runs on the world's own clock. A committee hearing is
scheduled through the existing future-due substrate and fires through the
ordinary time advance; there is no second legislative calendar. A rule that
requires a chamber's floor stages to fall on separate legislative days is
behaviour, not decoration: the next stage cannot be reached before its earliest
eligible date, and waiting for that day is a step the player takes on the same
clock as the rest of their life. One executive act carries one date — the
disposition, the action and the event all agree, and none of them may precede
the presentment they answer. Deadlines are shown to the player but do not yet
fire on their own, and no action deadline is claimed until calendar semantics
exist to compute one.

What a committee recommended and whether its motion to report carried are
different facts. A committee may report a bill with the opinion that it should
pass, that it should pass as amended, or that it should not pass, and all three
reach the floor; a committee that will not report the bill at all is a
different event with a different consequence, and the record shapes them
differently rather than defaulting one into the other.

The player is never offered another person's decision as a choice. Where a
measure sits with somebody the player does not control, the only step is to
wait, and what that person then does is revealed after the wait rather than
selected before it.

Consequence: the same engine runs three materially different institutions.
Kentucky is ordinary bicameral and a veto falls to a majority of elected
members in each house; Nebraska is one chamber with three separate
constitutional floor stages, no second house and no conference at all; Alaska
is bicameral but reconsiders a veto in one joint sitting of sixty members, at
three-quarters for money bills. Those differences change the legal route a bill
takes, not a label. Conference committees, calendars and deadlines as live
constraints, automatic adjournment, executive inaction firing on its own,
line-item and amendatory vetoes, confirmations, and the wider fifty states
remain deliberately unimplemented. No pack currently resolves what becomes of a
measure still pending at adjournment, so no measure can be recorded as dying
that way until one does.

## D-057 — Scenes and people are placed from declared contacts, and rasters are chosen by the screen

- Date: 2026-09-02
- Status: ACCEPTED
- Supersedes: nothing. It extends D-053 and D-054 rather than replacing them;
  no Stage 6 semantics, no player/save ownership, and no source-corpus decision
  is touched.

`EnvironmentSceneSpec` is the one scene contract, and the runtime now consumes
it. `src/presentation/scene-registry.ts` validates a spec and projects it into
what the compositor draws; the office fixture's camera, safe areas, anchors and
occluder are read from that spec rather than from a hand-written constant. A
second scene schema was available and was not created: the researched spec
already carried Camera, Anchor, Occluder, Zone, calibration and grade concepts,
and only the genuinely missing fields were added to it.

A scene may register with no raster at all. That is the honest state of a room
whose plate has not been made, and the runtime says the picture is missing
rather than substituting another room's.

Placement is computed from contacts, never tuned per sprite. A scene declares a
floor line per anchor and, for a seat, the seat plane, front, width and the
seat and backrest z-orders; a body declares its own soles and, for a seated
pose, its seated pelvis. Standing puts the sole line on the floor; seated puts
the pelvis on the seat plane and then checks the resulting soles against the
floor the chair stands on, because a seated person's feet are on the floor and
modelling only the pelvis is exactly why hand-placed seated sprites floated.
A body that predates the contract still places, by its pelvis root, and the
runtime records that its contact is unverified rather than implying it was
checked.

Authoring the seat and the floor together settles numbers that guessing would
not. The office fixture's floor line had to be 84% of plate height, not a
rounder figure: it is where a seated figure of those sprites' proportions
actually puts its feet once its pelvis is on the accepted 63.5% seat plane.

Perspective is a bounded linear ramp between two authored floor calibration
pairs, clamped rather than extrapolated. It is deliberately not a projective
camera: the generation pipeline cannot supply truthful camera intrinsics, and
inventing them would be fabricated measurement precision. Perspective depth and
paint order are now separate fields — depth is the floor line, order is
`zOrder` — and people in one scene sort by floor line rather than by the order
they were listed in. Named occluders each carry their own z-order, because a
desk front and a chair arm occlude a seated person differently and one flat
mask cannot say so.

One asset identity owns an ordered raster tier ladder, and the screen chooses
among them: the required device width is the painted plate times the device
pixel ratio, and the smallest tier at or above it wins. The runtime steps up
immediately, steps down only after 250 ms of continuous sufficiency, and keeps
painting the current raster until its replacement has decoded. The pipeline
never synthesizes or enlarges a tier; a raster carrying less real detail than
its pixel width claims must declare that, and the shortfall is reported rather
than hidden.

The supported fidelity envelope is stated on required device width, not display
width. For a viewport at or wider than the plate's aspect the two coincide; for
a taller viewport the cover-fit camera paints wider than the screen, so a
1920x1200 window at device pixel ratio 2 is a 3840-wide panel that still needs
about 4297 device pixels of plate. Stating the envelope on display width would
promise fidelity there that no 4096 tier can deliver.

Fidelity acceptance is separate from geometry acceptance and is asserted rather
than computed and discarded. The camera passes at every tested viewport and
always did; the shipped office plate fails fidelity from 1440x900 upward, and
conflating the two is how a soft plate kept a green suite.

For people: master dimensions are enforced by component class and an undersized
master is rejected rather than enlarged, with the enlargement it would have
needed stated. `art_class` separates production components from frozen
development fixture art, and fixture art is never promoted. Complexion is
source art on bodies and heads in named art-direction bands, never a runtime
recolour, never demographic truth, and never inferred from a person's name or
any other property; one head family is one complexion and a head must reach a
body of the same complexion in every body family it claims. Required slots are
enforced at resolve time, so a person with an empty required slot is not
complete however well the rest of them draws. A garment may block a conflicting
optional slot, and blocking a required one is a validation error.

Consequence: adding a room or a person component is data and asset authoring
against a stable contract. Development warnings are raised as data rather than
exceptions, so a wrong-looking person and the contract they broke appear in the
same view — the old floating-legs defect is now a named mismatch with both
numbers printed. Player-facing degradation copy stays free of that vocabulary
and says only what is actually being shown. Title tableau resolution exists as
presentation-only primitives that take eligibility as caller-supplied truth,
hold no saves and load no worlds, so no code path there can invent a biography.

## D-058 — Art declares where it came from, and authoring declares what it does not know

- Date: 2026-09-02
- Status: ACCEPTED
- Supersedes: nothing. It extends D-057, which established that scenes and people
  are placed from declared contacts and that rasters are chosen by the screen.
  This decision governs everything upstream of that runtime contract.

Adding a room is data authoring. The pipeline between an approved picture and a
registered scene is a set of contracts, and four of them are refusals.

**The repository never enlarges a raster.** A requested tier above the master is
skipped, the ladder is shorter, and the shortfall is stated. A 4096 file
carrying 2048 pixels of detail is a promise the runtime cannot keep, and the
cost is paid by whoever later assumes the number means something.

**An external upscale is admissible, and must be declared.** Rejected
alternative: banning upscaled masters outright. An externally upscaled render is
frequently the best art available, and a ban would have meant either losing it
or laundering it in by hand. Instead a candidate declares its lineage class and
its native-detail state, and a declared upscale carries `nativeDetailWidth`
forward into every tier derived from it, into the manifest, into the registry
and into the runtime's fidelity warnings. Downscaling does not restore
information and must not be allowed to erase the record of its absence.

`RasterTierDerivation` therefore gained `external-upscale-derivative`: real
pixels, admissible in production, detail that stops where the declaration says.
It is deliberately distinct from `upscaled-development-fixture`, which is an
enlargement this repository performed and which may never reach a production
plate. Rejected alternative: allowing `nativeDetailWidth` on
`deterministic-downscale`. That would have made a plain reduction's pixel width
untrustworthy by default, when the whole value of that derivation is that its
width IS its detail.

**A scaffold's unknowns stay unknown.** Every value the compositor needs starts
UNRESOLVED with a reason, and projection to a scene spec refuses while a
blocking gap remains rather than emitting plausible defaults. A scaffold that
quietly filled a floor line with 85 would produce a scene that registers,
renders, and puts everyone's feet slightly through the floor in a way nobody can
attribute to anything. `UNVERIFIED` is kept distinct from `UNKNOWN` because the
remedies differ: one needs someone to decide, the other needs someone to check.

**Nothing meaningful is read out of a filename.** Lineage, access class and
world label are declared by a caller. Intake reads declarations, not
directories; a file nobody declared is reported as undeclared rather than
adopted with a plausible history.

Two further separations follow.

Physical art identity is not a world label. A scene family describes the room;
what the World calls it — the player's apartment, their parents', a friend's —
is canonical truth supplied at binding time. One apartment plate serves four
homes across a career and one pavilion serves a childhood birthday and a
campaign meet-and-greet, which is the whole economic argument for the split.
Access class describes the kind of gate a place has and grants nothing: role
eligibility tags are a search key for future progression work, and passage is
decided from roles the World records.

Baked decor is not information. Production art may be lived-in — artwork, books,
plants, coloured paper shapes, a clock-shaped block — and must not be legible.
Anything the simulation owns goes in a declared dynamic surface slot, because
readable words baked into a plate are either wrong or are asserting something
the simulation never decided, and they are frozen either way.

Measured geometry is an authoring aid and never a replica claim. A number a
source stated is `direct-published`; a number measured off a drawing is
`scale-derived` and requires a scale resolved against a known reference span on
that same reproduction. Marking the second as the first is a validation error.
Evidence attaches to an archetype informed by several rooms, because what
transfers to a generic room is proportion, not any one room's dimension.

Consequence: approved masters, external QA passes and measured-geometry research
now have a schema to arrive through, and the failure modes they would otherwise
introduce — a soft plate believed sharp, a guessed floor line, a duplicated
apartment, a frozen bill number, a fabricated dimension — are unrepresentable
rather than merely discouraged. None of this is wired into PlayerGame; the
contracts and their tests exist first so that integration stays a cheap
decision.

## D-059 — One pose contract, and gaps that name themselves

**Decision.** A pose family is registered data with a posture class, a facing,
a root, contacts, eighteen landmarks, compatibility, a nominal canvas, a master
minimum, a production status, a human-QA state and a contact-verification state.
A scene anchor asks the registry for a posture; it does not take the first pose
any body happens to have art for.

The old resolver asked "does any body have this pose". That is the wrong
question, and it is how the office guest chair silently drew a desk-work body
in a guest chair. The right question is "does THIS person's body family have
art for a pose this anchor permits", and the registry can answer it because
identity resolution is pose-independent by contract: the recipe fixes body,
head and garment families before it looks at a pose.

Substitution is deliberately narrow. It only ever happens between poses the
anchor itself lists, because that author declared them interchangeable there,
and it is always reported. When nothing permitted can be drawn, the compositor
fails closed and the diagnostic names which body families do have art and which
do not, rather than saying "missing".

**Statuses are checked against the library in both directions.** A family
claiming released art must have some; a family claiming none must have none. A
status that could only ever flatter is not a status.

**Consequence.** The generation queue is computed rather than argued about. Of
four uncovered pose families, exactly one is blocking current gameplay, because
exactly one is asked for by a live scene anchor.

## D-060 — Structure is a control layer, not a paragraph

**Decision.** Every pose family generates one deterministic control plate from
its own landmarks: limb mass, a closed torso, the skull above the headless body
canvas, the contact planes, the skeleton, every landmark and both contacts. The
art validator re-derives every plate and rejects one whose landmarks moved
without regeneration.

This implements the structure-control research conclusion that exact body
structure and final visual rendering are separate control layers. Repeated
prose-only anatomy edits normalized toward a model's default proportions; that
was a control-method problem, not a prompt-wording problem.

A plate carries no text, because text in a control image bleeds into generated
art. A plate is never production art: no bone line, landmark dot or contact
ring may appear in a finished character raster. Anchor dots live in metadata and
a developer overlay draws them from there.

## D-061 — A master is a source, and a filename is not evidence

**Decision.** Twenty-five source masters are re-homed from the superseded PR #48
branch as `character-component-master` assets, permanently unreleased. Exactly
two meet the current dimension contract; none carries alpha. The thirty-five
normalized derivatives are rejected: they sit 3.1x to 11x below the contract,
and the garment set was enlarged above its own master, which is precisely the
failure the master minimums exist to prevent. Nothing is lost, because the
masters are here and the exact derivation recipe is preserved in provenance.

Identifiers are re-cut on intake. The source named heads and hair with
demographic tokens. Complexion is art direction, never demography, and is never
inferred from a name, so those tokens do not enter asset IDs or paths; the
received filenames stay in provenance so the lineage remains checkable.
Hairstyle names are kept, because a hairstyle names a hairstyle.

**Consequence.** The project now holds real production-size standing body
authority for the first time, and knows precisely what it does not hold: no
character master with alpha, and no head, hair or garment master within reach
of its own minimum.

## D-062 — A disposition without evidence is an assertion

**Decision.** What happened to superseded branch cargo and to downloaded asset
packs is recorded in one validated ledger. A `re-homed` claim must name real
manifest assets and must have been measured in this repository; an entry that
was not measured must name the command that would settle it; every disposition
must give a reason. No external pack is counted as coverage anywhere.

The animation library is archived on its purpose rather than its contents: an
animation library is motion data for a rig, and the operating rule excludes
rigging, 3D posing and extracting frames from rigs. The base-character and
office packs are held pending rather than rejected, because a 129MB and a 527MB
archive were not opened and rejecting them unseen would be as unfounded as
adopting them unseen.

**Consequence.** The asset bank inventory can state coverage without any of it
resting on something nobody checked.

## D-063 — Banked art is not catalog art

- Date: 2026-09-03
- Status: ACCEPTED
- Amends: D-055 (the disposition of its thirty-five derivatives only; its
  intake, provenance, measurement and occluder decisions stand)

Intake produces real files, real hashes and a real component definition long
before anyone has agreed the art is good enough to put on a person. D-055 let
those two things happen at once: the first thirty-five normalized derivatives
were written into catalog generation 2 and marked released, which asserted
production quality on behalf of art nobody had accepted.

Looked at, the assertion does not hold. The body masters are untextured gray
geometry mannequins, so every skin region a garment does not cover — hands,
neck, forearms, any leg below a skirt — renders gray; the garment masters are
unfitted design art rather than art drawn onto a body. Both are answerable only
by eye, and the answer is currently no.

So a banked part is now a distinct thing from a catalog component. A record
with `asset_type: "character-component-candidate"` carries its definition in
`candidate_component`, must be `unreleased`, and belongs to no catalog
generation. `createCharacterComponentLibrary` cannot see it, so no identity can
resolve to it however good its hash is. `liftCandidatesForReview` builds a
throwaway library from candidates alone, and the `?view=character-proof&set=real`
proof composes people from that — the surface on which the art is accepted or
rejected. Promotion is then a deliberate act: `candidate_component` becomes
`component`, the type changes, and the part joins a NEW generation.

Keeping candidates out of the catalog is what protects the frozen-generation
guarantee. A generation's membership is signed so a saved person resolves to
the same parts forever; admitting a component that cannot be drawn would either
render that person as a placeholder today, or change who they look like on the
day the art is accepted. Generations 1 and 2 still carry the exact members and
signatures PR #74 published, and a test reproduces both.

Consequence: thirty-five derivatives, twenty-five masters, five master
manifests, the deterministic intake, the seat-contact measurement, the occluder
repair and the recombination proof are all preserved and under test; not one of
them can reach a player until someone says so.

## D-064 — A surface carries information only if it can be read, and a symbol is an identity before it is art

- Date: 2026-09-03
- Status: ACCEPTED
- Extends: D-058 (the authoring pipeline) with the four systems below; no
  lineage, tier, scaffold or asset-bank decision is superseded

The approved environment library — three apartments, a civic meeting hall, an
executive suite and the Lexington staff office — now exists as authoring records
rather than as research notes. Five are scaffolds carrying measured floor ramps,
seat planes, staging positions and occluder rectangles; all five refuse to
project, because the plates are Drive-only and nobody has decided a camera or a
safe area. The refusal is the point: an incomplete scaffold is honest, and a
spec with plausible numbers standing in for decisions nobody made is not.

**Legibility gates promotion.** Thirteen visible frames and screens were
inspected across the six rooms; four became runtime surfaces and nine stayed
painted. The floor is 5% of plate height and 5% of plate width, with a 3% height
floor for foreshortened surfaces — a document on a desk is a large page seen
nearly flat — and no component floor at all for a surface carrying a known image
or one line of text. Generative models paint small blank frames on every shelf,
and promoting them yields a room of illegible dashboards; an illegible dashboard
is worse than a rectangle of paint because it asserts something nobody can
check. Applying the rule found one inconsistency in the inspection's own
dispositions: the staff office corkboard pin, promoted there, is about 46 pixels
across at 1080p and is declared ambient here, reversibly and with the number
recorded.

**A component surface says what may be drawn on it.** Twelve component families
— a trend line, a roll call, a district map, a briefing card and eight others —
each name the surface kinds they can honestly be drawn on and the empty state
they fall back to. Both halves matter: a roll-call grid on a domestic television
is a category error nothing at runtime would catch, and an empty state that
invents a plausible docket is a lie the art keeps telling. Every fallback says
the absence out loud.

**Civic symbols are identities with citations.** 188 flags, seals and arms
across 65 jurisdictions are recorded with their statutory authority, their
restriction statutes and their colours, and every one is `not-acquired`: this
repository holds no symbol artwork. Three rules are structural rather than
advisory. There is no asset status meaning "generated", so an AI-drawn seal is
unrepresentable rather than discouraged. A symbol that has not been acquired
cannot carry an asset path. `symbolUsePermitted` refuses campaign and commercial
contexts without reference to which symbol is being asked for, because the
prohibition is about the use.

**A downloaded pack answers two questions, not one.** What the licence permits
and whether the files are the kind of thing this renderer draws are independent,
and answering only the second is how unlicensed art gets shipped. `use-now`
requires a licence stated in a document inside the archive AND at least one file
of finished 2D art; anything else is archived or rejected with a reason from a
closed vocabulary.

**The generation queue says where art is, not just that it is wanted.** Most of
what looks missing is not: it is banked here unreleased, or in Drive at the
wrong resolution, or covered by a fixture nobody has noticed. Of 115 modular
person assets accounted for, 58 are genuinely missing, 13 exist and fall short
of a stated measurement, 2 exist and pass, 35 are banked here, and 7 are
fixtures standing in silently.

Consequence: adding a room is authoring data. What is still missing to ship one
is bytes and two human judgements — a camera, and whether the art is good enough
— and the records say which is which rather than blurring them.

## D-065 — A banked candidate is in no generation, and says so

- Date: 2026-09-03
- Status: ACCEPTED
- Repairs: D-063 (its representation only; every disposition it made stands)

D-063 said a banked candidate "belongs to no catalog generation". The records
said otherwise: all thirty-five declared `catalog_generation: 2`, because
`candidate_component` was typed as a full `CharacterComponentDefinition` and
that type requires the field. The intake wrote 2 into every derivative, and the
review lift built a generation-2 library by reading it back. Nothing leaked —
the catalog could not see these parts and no saved person's appearance moved —
but the schema, the generator, the tests and the prose disagreed with the
binding contract, which an independent acceptance sweep reported.

The disagreement is worth repairing rather than documenting away. A generation's
membership is signed so a saved person resolves to the same parts forever, and a
record that names a generation it is not in makes that signature harder to
trust: it asserts a membership no ledger backs. "In no generation" and "in
generation 2 but hidden" are different claims about the catalog, and only the
first is true of art nobody has accepted.

So a candidate now carries no generation at all.
`CharacterComponentCandidateDefinition` is `CharacterComponentDefinition`
without `catalog_generation`, derived from it so the two cannot drift, and the
single difference between a banked part and a catalog part is the one that
matters: membership. The field is absent rather than zero or null, because a
candidate has no membership to state, not an empty one.

A generation is assigned where admission happens and nowhere else.
`promoteCandidateComponent` takes the generation from its caller, because
admitting a part is an authorized decision about the catalog rather than
something the part decides about itself. That function is the only place banked
art is given a generation, which is what makes this decision a fact about the
code rather than a sentence here. It writes nothing and promotes nothing; the
thirty-five remain banked, unreleased, and awaiting the human visual acceptance
D-063 reserves.

Two consequences follow. `liftCandidatesForReview` has no number to carry over,
so it stamps its own: the throwaway review library is one generation containing
exactly the candidates, invented locally and never written back. And because the
manifest is JSON and cannot be held to a type,
`validateCharacterComponentCandidates` rejects any candidate that declares a
`catalog_generation`, so the repair cannot quietly regress the way it arrived.

Consequence: the published generations, their frozen signatures, the forty-six
development fixtures and every disposition D-063 made are unchanged. What
changed is that the records now say what the authority always said.

## D-066 — A sitter is placed by what touches the chair, and a chair is where the picture says it is

- Date: 2026-09-03
- Status: ACCEPTED
- Repairs: D-055 and D-057 (the office fixture's seat geometry only; their
  intake, pose, contact and authoring decisions stand)

Human visual review of the office fixture rejected both seated figures: the
primary sitter read as hovering in front of her chair rather than sitting in
it, and the guest read as intersecting his. Neither was an art defect. Both
rasters are coherent people, and the compositor placed them exactly where the
scene told it to. The scene was wrong in two independent ways, and each hid the
other.

**The chairs were never measured.** Both anchors declared a seat plane of about
63% and a shared floor line of 84%. The 84% was not read off the plate at all;
the fixture's own comment recorded that it was derived from the 63.5% seat
plane by asking where a sprite's feet would land. One unmeasured number was
solved from another, so the two agreed with each other and with nothing in the
picture. Measured off the runtime plate, the desk chair's cushion occupies
y 68.4%–75.6% and the guest chair's y 61.8%–65.2%; the old 63.5% sat a third of
the way up the desk chair's BACKREST. The two chairs also stand at different
depths and cannot share a floor line: the desk chair's base meets the carpet
near 91%, the guest chair's legs near 75%.

**The placement point was the wrong point.** `composeOfficeVisuals` placed each
recipe's `root` — the pelvis-hip-CENTRE, a joint inside the body — on the seat
plane. The thing that rests on a cushion is not that joint but the buttock and
thigh surface a couple of percent of raster height below it. The recipes had
declared a `seatedContact` all along and the compositor ignored it, while the
modular path in `scene-placement.ts` has always placed seated bodies by their
`seatedPelvis` contact. Two paths, two meanings, one of them silently wrong.

So each anchor now carries its own measured cushion and its own measured floor
line, the seat plane sits one third forward of each cushion's back edge because
a sitter with their back against the backrest rests on the rear of the seat,
and the compositor places the measured seat contact rather than the hip joint.
Each sprite's contact-to-sole span then covers its own seat-to-floor gap, so
pelvis-on-cushion and soles-on-floor hold together instead of being traded
against one another. `standard_body_width_percent` moved from 21.5% to 19.48%
because it is solved against those lines and the lines moved.

Two consequences worth recording. The desk anchor returns from 79.2% to the
measured cushion centre at 77.2%: the 79.2% was a staging offset that existed
only because the body was placed by its hip joint, which pushed its visible
mass right until it threatened the safe area. And the working-document and
briefing-memo affordances move above the scene-person hitboxes, where the civic
marker already sat — a correctly sized sitter's transparent hitbox now reaches
across the desk, and it must not swallow the click that opens the paper beneath
it. Nothing about the painted scene changes; the person button draws nothing.

Consequence: the office fixture's layout, occlusion rules, attachment system
and composition are untouched. What changed is that the numbers describing the
furniture are now read off the furniture, and the point placed on a chair is
the point that touches it.

## D-067 — The production office is a different room from the fixture, measured from its own master

- Date: 2026-09-03
- Status: ACCEPTED
- Supersedes: nothing. D-055 and D-057 keep the fixture; this adds the first
  production scene beside it.

Three rounds of human visual review of "the office" were rounds of review of a
development fixture. `office-council-staff-fixture` declares
`presentation_status: development-fixture`, a 1024x572 prompt30 plate, and a
2048x1144 tier registered honestly as an upscale carrying no detail past 1024.
Its own `explicit_unknowns` say its numbers "should not be copied into a
production scene". It was the only office surface that existed, so every
placement repair polished it and every screenshot of it was read as the game.

The canonical Drive library already held an approved master —
`OCD_SCENE_MASTER_SHARED_WORKROOM_OFFICE_5504x3072_01.jpg`, 5504x3072 — but
Drive is not a runtime: the runtime imports `art/**` and nothing else, so a file
sitting in Drive is not selectable however approved it is.

So the master is now IN the repository, preserved byte-for-byte under
`art/references/masters/scene-environment/` with its Drive id and sha256
recorded in provenance, and carried into the runtime as two Lanczos-3
DOWNSCALES at 1376x768 and 2752x1536. Both are `deterministic-downscale`, so
neither declares a native-detail shortfall: their pixel width is the truth.
Nothing in this repository enlarged anything.

`shared-workroom-office-production` is the scene, and every number in it was
measured from that master. The room's tiled floor is its own ruler: a 12-inch
commercial tile measured near and far gives the apparent size of a known length
at two depths, which solves the horizon at 39.9% of plate height and yields
one metre ~= 0.585 * (floor_y - 39.9)% of plate height. The floor calibration,
the 18.42% standard body width and the cross-check on the one measurable seat
all come out of that single relation. Nothing was transplanted from prompt30;
a test asserts the two scenes share no plate, no ramp, no body width and no
anchor.

Only one chair in the room has a visible cushion. Every other seat is hidden
behind a work table, so no seat plane can be measured for it, and those chairs
are deliberately NOT declared as seat anchors rather than being given plausible
numbers. The near table's occluder region is declared without an alpha mask,
because nothing renders behind it yet and painting a speculative mask over a
plate this detailed would be inventing geometry to satisfy a checklist.

The production scene composes from `PRODUCTION_ONLY_CHARACTER_LIBRARY`, which
is filtered to components that are not development fixtures. That set is empty
today, so every anchor fails closed and the proof surface says which anchor
failed and why. The authored A01/B01 recipes stay where they belong: on the
fixture route, keyed to historical fixture appearance seeds, and a test forbids
them from appearing on the production scene under any path.

Consequence: `?view=production-office` is where office visual acceptance now
happens, and it states its scene id, environment asset id, raster tier and
derivation, production status and per-anchor rendering path on the page. A
screenshot of it cannot be confused with a screenshot of the fixture, which is
the confusion that cost three review cycles. `?view=office-fixture` survives,
unchanged and clearly labelled, as regression evidence.

## D-068 — A body root is not a garment attachment, and the banked bodies' anchors are not authoritative

- Date: 2026-09-03
- Status: ACCEPTED
- Amends: D-055 and D-063 (the standing of the banked candidates' attachment
  metadata only; their disposition as unpromoted reference evidence stands)

With debug anchors on, human review found the `hips` attachment anchor on both
banked bodies reading around the lower abdomen rather than the pelvis. The
numbers confirm it: `pg_body_ml_standing_v1` puts its pelvis root at y 0.5396
and its `hips` anchor at y 0.3479 — the garment hip line is authored roughly a
fifth of body height ABOVE the hip joint it is named after.

This is not a labelling nit. Bottoms attach to `hips`, so every trouser, skirt
and pair of jeans in the bank hangs from the wrong line, and any fit judgement
made against those garments was made against a contaminated placement.

The repair is NOT to move the numbers. These bodies are rejected for production
on their own merits — untextured gray geometry is structural and reference
evidence, never player-facing body art — and quietly correcting their anchors
would be promotion by the back door. Their attachment coordinates are therefore
declared non-authoritative visual estimates on the records themselves, with the
instruction that they are not to be inherited or repaired.

What is added instead is the rule the next body will be held to.
`CHARACTER_SEMANTIC_ANCHOR_ORDER` names six points that are different things
with different jobs, and `validateProductionBodyAnchors` enforces two facts
about them: they descend the body in order, and the garment `hips` attachment
sits at or below the pelvis root, because a waistband does not ride up inside
the ribcage. The root is the rig's placement point and nothing is worn on it;
`feet` is a floor CONTACT and not an attachment at all.

A test records that both banked bodies fail this rule, and says in its own name
that they are not to be repaired to make it pass. Every future production body
master measures these anchors from its own raster rather than inheriting them
from a DEV fixture or normalizing them by eye, and shows them over that raster
on a debug proof before any wardrobe family is accepted against it.

Consequence: the distinction between placement and attachment is now written
down and checkable, the contaminated coordinates are labelled where someone
reading the record will see them, and no rejected art moved a pixel closer to
production.

## D-069 — The title screen resolves a room the way every other surface does, and can name no office

- Date: 2026-09-03
- Status: ACCEPTED
- Supersedes: none

The title screen was plain markup on a pale page while `title-tableau.ts`,
`scene-registry.ts` and `raster-tiers.ts` all existed and all passed their own
tests. The resolver was correct and unreachable, which no unit test on the
resolver could detect, so the first artefact of this decision is a browser test
that fails when the front door paints nothing.

The tableau an ordinary adult resolved to was the Lexington council staff
office, because it was the only tableau in the bank. That is the
universal-office substitution the consumer map forbids, and gating it more
tightly is not the repair: the fact that would justify that room is which
jurisdiction a character's job answers to, and a save summary does not carry it.
The Lexington tableaux are therefore ABSENT from the title registry rather than
restricted, and a test walks every capability set a summary can produce to prove
no path reaches them.

What a save summary can honestly support is an age and whether a residence is on
record. `titleHeroFromSaveSummary` emits `adult` and `residence-known` and
nothing else; `office` and `legislature` exist in the registry and are never
emitted, so the tableaux gated on them cannot match. When the persistence lane
carries canonical capability tags on the summary they belong in that one
function, and the tableaux light up with no change to the registry or the shell.

The community meeting hall is banked for its EMPTY state only. Being an adult,
or having a job, does not mean a character has ever spoken at a public meeting;
putting them at that lectern because the picture contains a lectern is
presentation inventing a life. A no-save title uses one named front-door tableau
rather than a deterministic pick, because the first screen of a game is the one
place stable-but-arbitrary is wrong.

Consequence: the title screen shows approved production art, an ordinary person
is shown an ordinary room, a child is shown a room with their name on it and no
figure at all, and no title can show jurisdiction-specific office art.

## D-070 — A room is measured from its own raster, or it says it is not measured

- Date: 2026-09-03
- Status: ACCEPTED
- Supersedes: none

Four production plates were authored in this packet. None declares a floor
calibration or a standard body width, and that is a refusal rather than an
omission.

The two apartments and the title hall have no repeating floor unit, so their
plates contain no ruler and any near/far pair would be a guess wearing a
measurement's clothes. The hearing room DOES have a tiled floor, and it was
measured: successive tile seams sit at plate y 63.7%, 69.5%, 76.6%, 85.5% and
96.5%. Fitting those to a flat floor under a fixed camera solves a horizon near
the very top of the frame, which the room's own walls and ceiling contradict.
The plate is an illustration and is not drawn on one consistent perspective. The
measurement is recorded in `explicit_unknowns` and no calibration is derived
from it, because a ramp fitted to numbers that do not describe a camera would
place every future person in that room wrongly and look deliberate.

Three rules are now executable. A production scene either declares a calibration
pair or says in `explicit_unknowns` that it does not. No scene declares a body
width without the ramp that scales it, because a size with no perspective paints
everyone the same height whatever floor they stand on. And no two rooms share a
ramp or a body width: two rooms agreeing to three decimal places did not both
measure out that way, one was copied, which is exactly what made the fixture's
numbers into "the project's numbers" before D-067.

Consequence: an uncalibrated production room is a stated fact rather than a
missing field, and the first person composed into any of these rooms will be
placed against a ramp measured for it, not inherited from another picture.

## D-071 — A missing picture is a record, and a generator seed is never its name

- Date: 2026-09-03
- Status: ACCEPTED
- Supersedes: none

Every gap in this project had been recorded as a sentence in a report. Sentences
do not reconcile: nobody can ask a paragraph whether the thing it wants has
since arrived, and when the standing queues were checked against the current
Drive, four of their answers had changed. A hearing-room master had arrived and
closed a gap the consumer map called permanent; an executive office master and
two title tableaux had been moved into the rejected folder while the
repository's intake request still listed them as approved.

`asset-request.ts` makes the ask durable. Every request carries a stable
semantic id, a lifecycle, the consumer it unblocks, what was SEARCHED before it
was asked for, and acceptance criteria a delivery can fail. The inventory check
is required because commissioning a second copy of something the project already
owns is a mistake this project has made.

A diffusion seed may be recorded as provenance and may never be an asset's
identity. A seed names one roll of one model's dice: it survives no model
upgrade, describes nothing about what the picture is for, and cannot be searched
for by anyone asking whether the asset exists. The validator rejects a
seed-shaped or digest-shaped request id.

The return path is deliberately NOT reimplemented. `asset-lineage.ts` already
measures a candidate and issues a disposition; `asset-bank.ts` already records
the verification with hash, container, dimensions, transparency, style-family
judgement and artifact flags. A second verification record would give the
project two answers to "was this accepted".

Consequence: a gap is a record with an id that survives being solved, a stale
request is closed with a reason rather than requeued, and the queue can be
checked against the manifest by a test rather than by a person.

## D-072 — A surface says nothing unless a canonical owner fills it

- Date: 2026-09-03
- Status: ACCEPTED
- Supersedes: none

Scenes declare surfaces — screens, boards, placards, documents on tables — and
each names the classes of information it could carry. `surface-binding.ts`
decides what appears on them, and its whole design is one refusal: presentation
never supplies a payload.

The chain is base plate, to a slot measured off that plate, to a canonical owner
that holds the fact, to a binder, to the visible room. If the third link is
missing the chain stops and the slot shows the decoration the scene already
declared for it. It does not show a plausible bill number, a seal that looks
about right, or a date because a screen is the sort of thing that has one.

Today the world owns exactly one of the offered classes: the date.
`worldSurfacePayloads` binds `calendar-date` and returns nothing for bill
numbers, tallies, seals, headlines, portraits, agendas and results — and that is
a description of the simulation, not a limitation of the binder. "No owner" and
"owner with nothing" are kept as separate states, because the second is the more
actionable of the two and collapsing them hides that a system exists and is
empty.

This matters more than it sounds. Every surface in this game is in a civic room.
Inventing any of those classes produces a picture of a government that does not
exist, which is indistinguishable from a simulation bug and much harder to
notice.

Consequence: 26 declared surfaces across seven rooms currently show their
painted decoration and say why, on a review route, instead of being quietly
blank or quietly wrong.

## D-073 — A sheet is chopped by its own alpha, and a clean chop is not an approval

- Date: 2026-09-04
- Status: ACCEPTED
- Supersedes: none

Four source sheets arrived and 32 components came out of three of them. Two
rules came out with them.

The first is that the grid is never assumed. These sheets do not divide evenly
by their column count — 3584 across three columns is 1194.67 — so a fixed
lattice shaves a pixel off some cells and not others, and the components stop
being reproducible from the sheet. `source-sheet-chop.ts` projects each sheet's
own alpha onto both axes and takes a cell as the intersection of one occupied
column band with one occupied row band. A sheet laid out differently segments
differently with no parameter changing.

Background haze is cleared first, at alpha 8 rather than the alpha 1 the hair
intake used, and the threshold is evidence rather than taste: roughly 22% of
every sheet sits at alpha 1..8, and sampling found 98% of it more than four
pixels from any pixel above alpha 64. It is background, not the soft edge of
anything. The count cleared is reported per sheet, because a cleanup nobody can
see the size of is a cleanup nobody can check.

The second rule is the one that matters more. Twenty of the 32 cells chopped
perfectly and are still not usable. Eight adult bodies carry a green silhouette
contour on 67-80% of their soft-edge pixels — the approved character style
authority has no silhouette stroke of any colour, and at the ~250 plate pixels a
body actually paints at, the rim is plainly visible. Twelve footwear pairs are
drawn as bonded three-quarter product views while the body family stands
front-on with its feet apart. Neither is a quality fault and neither is fixable
by cropping differently.

So the disposition vocabulary is per cell and separate from the chop: PASS,
REVISE, REJECT, recorded in `art/qa/p71/source_intake_dispositions.json` with
the measurement that produced it. Twelve heads PASS. Twenty cells are REVISE. No
cell was promoted, and no body attachment anchors were authored at all, because
D-068 requires a production body's six semantic anchors to be measured from the
raster that actually ships — and this raster is going to be re-exported, so
anchors measured now would be discarded, and authoring them to look complete is
precisely the failure D-068 records.

Consequence: chopping is measurement. The project can now take a dense sheet
apart reproducibly, say what each cell is, and say why a good cell is still not
shippable, without either discarding the sheet or promoting it.

## D-074 — Causal tracing is a read-only projection that renders absence as UNKNOWN

- Date: 2026-09-03
- Status: ACCEPTED
- Supersedes: none

The project can now read how canonical truth, claims, knowledge, perception,
belief, decisions, relationships and consequences connect in a save. It reads
them; it does not record them. `src/devtools/**` projects existing records into
a graph whose every edge is a field the record already carries —
`parentCausalIds`, `source.claimId`, `eventId`, a `supersedes` pointer, a mind
source reference — and holds nothing between inspections. There is no second
history store and no second causal graph. The downstream direction is derived
at inspection time by reversing recorded parent edges, because the world
records parents and not children, and persisting that reversal would turn a
convenience into a competing source of truth.

Nothing in the tool joins records by matching dates, names or text. That is the
temptation the whole design resists: such a join produces a graph that looks
causal and is not, and once it is in an exported trace an invented parent is
indistinguishable from a recorded one. Where a nullable link field is null, the
projection emits an unrecorded link naming the field and saying why nothing
follows. Where a walk stops, it says which of five things stopped it: nothing
was recorded, the target belongs to no registered source, the depth limit was
reached, the edge closed a loop, or the edge reached a record another path had
already reached. A shared ancestor is not a cycle, and reporting it as one
would invent a loop the world does not have.

Record class and truth origin are separate axes. Class answers what kind of
record this is — canonical event, spoken claim, knowledge received, perception,
mind state, private belief, public position, commitment, relationship change,
decision trace, effect activation, presentation metadata. Origin reads the
record's own provenance field and distinguishes authored and initialization
background from simulated truth. A family carrying no provenance is
`unrecorded`, which is not a synonym for authored, and a record the repository
cannot justify classifying stays `unknown`.

Which record families are traceable is a registration rather than a hard-coded
list. A family becomes visible by registering a `TraceSource`; the graph logic
knows nothing about which families exist. A registered source may not
manufacture an edge, and may not claim a record id another source already
produced — shadowing is rejected rather than merged, because a silent
replacement would change what a trace means without changing anything visible
about it. Later narrative and Pennywise trace sources register through this
seam and require no change to the walker, index, export or UI.

Absence of a record is never by itself evidence of absence in the world. The
observer projection answers "who did not hear this" in two separately labelled
ways: a person the event record lists as a participant who has no knowledge
record citing the claim, and a person some caller's presence set names whom the
event record does not list at all. The caller must state where that presence
set came from and the trace repeats it. With no presence set supplied, the
trace says plainly that it can only speak about recorded participants.

Exports carry seed, world id, schema and generator version, history frontier
and world content id, so a trace pasted into a bug report is something the next
person can regenerate and diff. Identical replay plus identical request
produces byte-identical output, through `canonicalJson` rather than a second
serializer. The devtools boundary forbids ambient entropy for the same reason
the simulation does.

Consequence: audibility is visibly causal rather than cosmetic. The same two
conversation turns, run quiet instead of normal, produce a different resolved
listener set, a different set of knowledge records, a different set of
perceptions, and a second-turn decision whose recorded chain ends somewhere
else entirely. The tool did not arrange any of that; it read it back off the
records. The inspector remains a development route at `?view=causal-trace`
that ordinary play cannot reach, and opening, filtering, walking, comparing and
exporting leave the world's canonical serialization, content hash and append
frontier identical.
