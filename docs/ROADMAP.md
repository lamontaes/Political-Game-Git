# Long-Term Engineering Roadmap

Status: **AUTHORITATIVE FOR SEQUENCING AND INTEGRATION INTENT**

## Authority and Use

This roadmap reconciles the implemented foundation with the intended long-term build order.

- [Game Constitution](GAME-CONSTITUTION.md) is higher authority than this roadmap.
- Accepted, non-superseded entries in the [Decision Log](decisions/DECISION-LOG.md) govern architectural choices.
- [Architecture](../ARCHITECTURE.md) and current [system documents](systems/) are authoritative for implemented behavior.
- This roadmap describes sequencing, integration, and future intent. A future item is not authorization to invent its detailed mechanics early.
- A stage is complete only when its implementation, tests, validation, and affected authoritative documents agree. Mention in a prompt or roadmap does not mean implementation exists.

## Dependency Spine

The intended dependency direction is cumulative:

```text
world + stable identity + deterministic time
  -> factual history
    -> memory + knowledge + claims + relationship history
      -> sparse beliefs + principles + expertise
        -> personality + values + goals + appraisal
          -> subjective perception
            -> general decision engine
              -> life + households + organizations + resources
                -> world state + economy + policy effects + events
                  -> mutable law + institutions + authority
                    -> sourced civic data
                      -> population + public opinion
                        -> parties + campaigns + elections
                          -> governing + fiscal + legislation
                            -> staff + appointments + administration
                              -> courts + national/international expansion
                                -> archives + Observer Mode + branching
                                  -> vertical-slice stabilization
```

Later systems must consume stable records and queries from earlier stages rather than replacing their identities or parsing presentation prose.

---

## Stage 1 — Deterministic World Foundation

Status: **COMPLETED**

### Purpose

Establish the repository authority hierarchy, technical boundaries, deterministic world skeleton, and the smallest headless simulation and diagnostic viewer on which later persistent systems could safely build.

### What Actually Landed

- Repository instructions, Constitution, architecture, system contracts, UX/build/acceptance documents, decision log, completed-plan workflow, and sourced-snapshot conventions.
- TypeScript, React, Vite, Vitest, ESLint, Prettier, and a Sites-compatible diagnostic build with a minimal dependency set.
- A pure `src/simulation/` package separated from React, DOM, browser globals, persistence adapters, and external services.
- Versioned seeded RNG behavior with normalized textual seeds, unbiased bounded integers, and non-consuming keyed forks.
- Stable hashed IDs derived from entity kind and semantic keys.
- JSON-safe `World`, `Person`, and `Jurisdiction` records, an explicit simulated date and action sequence, and a visibly synthetic Lexington-Fayette placeholder.
- Canonical historical event identity, append order, occurrence/recording dates, jurisdiction and entity references, tags, and summaries.
- Lightweight people plus deterministic, stored, idempotent person materialization that preserves identity and established state.
- UTC-safe date-only arithmetic and explicit positive-day advancement.
- A deterministic demo that creates six people, advances time, records occurrences, materializes an existing person, and replays the same actions.
- A React developer viewer for world creation/reload, time advancement, people, person detail, and global event inspection.
- Headless CLI execution and automated boundary, RNG, stable-ID, calendar, world-transition, materialization, and replay tests.
- A persistence architecture boundary and JSON-safe domain design. SQLite itself was deliberately deferred to Stage 2 rather than falsely reported as implemented in Stage 1.

### Major Architectural Decisions

- Pure simulation dependency boundary (D-002).
- Minimal TypeScript/React/Vite stack and temporary Sites-hosted diagnostic viewer (D-003).
- Keyed seeded randomness and semantic stable IDs (D-004).
- Nondiegetic progressive materialization (D-005).
- Immutable JSON-safe state and append-oriented history (D-006).
- Data-driven jurisdictions and explicit placeholder provenance (D-007, D-009).
- No required AI service or proprietary implementation (D-010).
- Rejection of an oversized foundation-stage vertical slice (D-011).

### Validation Evidence

The completed Stage 1 plan records a passing full validation run, dependency audit, deterministic headless replay, and tests covering fixed RNG vectors, meaningful seed variation, stable IDs, calendar behavior, immutable time/history transitions, materialization stability, ambient-entropy rejection, and the React-free simulation boundary. The current suite continues to exercise those invariants.

### Deliberately Deferred

Durable SQLite saves, rich biography and subjective history, sourced civic data, institutional rules, beliefs, autonomous NPC decisions, careers, elections, legislation, staff, populations, final UI, Observer Mode, and branching.

### Important Future Consumers

Every later stage consumes world identity, simulated time, stable IDs, keyed RNG scopes, pure transitions, progressive resolution, and the headless/persistence boundary.

---

## Stage 2 — Character and History Foundation

Status: **COMPLETED**

### Purpose

Make a person capable of accumulating a coherent factual and subjective life that later dialogue, relationships, politics, archives, and autonomous reasoning can query without rewriting historical truth.

### What Actually Landed

- Typed stable biography facts for birth date, birthplace, dated residences, family relationships, education, and occupation, each with semantic identity and provenance.
- Context-rich canonical events with typed participants/roles, witnesses, visibility, tags, location/setting, social context, pressure, choice, motivation, immediate reaction, and explicit biography constraints.
- Separate append-oriented memories with strength, relevance, interpretation, and supersession.
- Separate person-specific event knowledge with believed content, confidence, accuracy, and direct, told-by, public-record, media, or rumor provenance.
- Separate claims/statements with audience, provenance, and explicit relationship to canonical truth.
- Relationship histories made of dated typed interactions rather than an exposed relationship meter.
- Generic fact/event/age/geography/experience/relationship/shared-work queries.
- Progressive materialization that checks factual and historical constraints and preserves all established person/history references.
- An integrity-checked versioned JSON snapshot envelope.
- A Node-only strict SQLite repository that saves, loads, lists, and replaces complete snapshots while keeping SQLite outside `src/simulation/`.
- Developer inspection for person timelines, rich event context, participants, known-by records, claims, memories, and relationship episodes.
- Long-term tests proving that contextually different events remain distinct, truth survives contradictory speech and inaccurate secondhand knowledge, memories can diverge and evolve, and a minor teenage event remains queryable forty simulated years later.

### Major Architectural Decisions

- Complete validated snapshots in a Node-only SQLite repository, without prematurely normalizing every record into SQL tables (D-015).
- Canonical truth, memory, knowledge, claims, and relationship history as distinct record families (D-016).
- Typed factual biography plus generic historical queries rather than special-case life-experience fields (D-017).
- One contiguous history sequence across record families and explicit supersession rather than silent replacement.

### Validation Evidence

The Stage 2 completion plan records a passing full validation run and zero-vulnerability audit. Current automated tests cover biography invariants, contextual event distinctions, contradictory claims, inaccurate told-by knowledge, subjective memory reinterpretation, relationship/work queries, decades-long retrieval, snapshot tamper/version rejection, and SQLite round trips.

### Deliberately Deferred

Automatic knowledge propagation, final asymmetric trust/obligation mechanics, causal event graphs, corrections, employer/organization entities, final personality/goals, autonomous choices, dialogue, player-facing archive filtering, migrations, action journaling, recovery, branching, elections, campaigns, and legislation.

### Stage 2 Scaffolding Cautions

1. Stage 2 originally used simple generated expertise/personality/current-goal arrays as proof scaffolding. Stage 3 replaces the expertise representation and removes generated personality/goals. Neither the old fields nor any future replacement may be treated as a final personality or goal system; that belongs primarily to Stage 4.
2. `deriveRelationshipSummary` is a coarse internal helper over interaction history. It is not the final relationship model and never replaces specific introductions, favors, support, conflict, betrayal, loyalty, disagreement, memories, or third-party knowledge.
3. Occupation facts currently identify employers by text. This is temporary. Future employment and organization modeling should use stable organization and location IDs where appropriate; equal employer text alone is not reliable coworker identity.
4. Person materialization changes simulation detail, not in-world history. A lightweight person already existed before expansion, so opening or activating them does not create a historical event.
5. Keyed materialization RNG scopes must remain isolated so expanding one NPC does not unnecessarily perturb unrelated future simulation streams.

### Important Future Consumers

Stage 3 belief provenance; Stage 4 perception and decisions; Stage 5 careers; Stage 6 event chains; Stage 9 opposition research and dialogue; Stage 10 political memory; Stage 11 staff continuity; and Stage 12 archives, briefings, Observer Mode, and branching.

---

## Stage 3 — Beliefs, Principles, Knowledge, and Expertise

Status: **COMPLETED**

### Purpose

Build the first real political-belief and substantive-knowledge foundation without introducing a universal ideology score or an autonomous opinion engine.

### Consumes

- Stable people, factual biography, and progressive detail.
- Contextual event history, memories, event knowledge, and provenance.
- Relationship histories and trusted-person references.
- Stable IDs, append sequence, deterministic transitions, and snapshot integrity.

### Produces

- A shared data-driven policy catalog: domain -> issue/subissue -> specific proposition.
- Sparse provenance-bearing proposition exposure so never encountered and encountered-without-a-view remain distinct.
- Sparse proposition-specific private beliefs with position, conviction, salience, flexibility, history, and formation context.
- Separate public positions and campaign commitments.
- Broad, qualified, potentially conflicting political/philosophical principles.
- Structured subject familiarity, understanding, expertise, and practical experience with traceable provenance.
- Education- and occupation-derived knowledge profiles without ideology inference.
- Queries for exposure/opinion state, current and historical beliefs, dated position changes, statements, commitments, principles, domain coverage, knowledge, practical experience, and resolved life/perceived-information context.
- Diagnostic inspection of those records without raw universal scores.

### Major Architectural Decisions

- Proposition-specific beliefs are sparse records over a shared catalog, while substantive knowledge remains a separate axis (D-018).
- Encounter/exposure history is distinct from belief formation, and perceived formation context retains source provenance rather than granting omniscient access to canonical history (D-020).
- Private belief, public position, campaign commitment, broad principle, and subject knowledge are separate append-oriented record families with stable identities and explicit histories.
- Explicit third-party sources cannot self-reference, all historical references must already exist in the global sequence, and subjective records cannot predate the people or information they depend on.
- Person materialization expands simulation detail without inventing retrospective beliefs, knowledge, personality, goals, or ideological scores.

### Validation Evidence

The completed Stage 3 audit records a passing repository validation run: formatting, lint, TypeScript checking, 62 tests across 8 files, production build, and deterministic headless replay. `npm audit --audit-level=high` reported zero vulnerabilities. The local diagnostic viewer was also exercised in the in-app browser, including time advancement and person materialization; the Stage 3 political profile rendered without console errors.

### Deliberately Deferred

At the Stage 3 checkpoint, character mind, appraisal, subjective perception, and autonomous decision-making were reserved to Stage 4. Stage 4 now supplies that foundation and an explicitly invoked NPC political-belief adapter. Population-scale background opinion change, political-action classification, campaigns, elections, legislation, Life Mode, the causal event engine, a large policy/content library, player-facing political dialogue, and polished game UI remain future work.

### Major Future Consumers

Stage 4 NPC decisions; Stage 8 public opinion; Stage 9 dialogue, speeches, debates, interviews, and campaign commitments; Stage 10 legislative support; Stage 11 advisers; and Stage 12 historical archives.

---

## Stage 4 — Character Mind, Appraisal, and Autonomous Decisions

Status: **COMPLETED**

### Purpose

Teach the simulation who a person is, what they value, what they want, what they think is happening, what experiences mean to them, and how they make a bounded, explainable decision.

### Consumes

Stable people and time; factual and contextual history; memories, event knowledge, claims, and relationship episodes; sparse political beliefs and principles; substantive knowledge/expertise; and keyed deterministic RNG.

### Adds

- Sparse, historically mutable personality tendencies and personal values that remain distinct from political principles and proposition beliefs.
- Structured persistent goals with priority, status, targets, deadlines, and explicit completion, failure, abandonment, or supersession.
- Personal appraisal/meaning records distinct from objective events and memories.
- Subjective perception assembled from information actually available to the character, with provenance, uncertainty, contradictions, and as-of reconstruction.
- Lightweight temporary-state hooks for contextual decision inputs rather than a mood minigame.
- A reusable decision architecture with explicit hard constraints, conflicting soft considerations, bounded keyed randomness, and structured traces.
- Non-applying development proposals for later gradual personality, value, goal, and relationship change.
- NPC political-belief formation as the first domain adapter over the general engine.

Stage 4 does not implement formative-life gameplay, careers, households, resources, organizations, campaigns, elections, institutions, legislation, or a polished player UI. It does not map personality or values directly to ideology, and it never silently applies major internal choices to a player-controlled character.

### Major Architectural Decisions

- Appraisal remains distinct from event truth and memory; values remain distinct from personality, political principles, and proposition beliefs (D-021, D-022).
- One general, subjective, provenance-bearing decision architecture owns hard constraints, conflicting considerations, deterministic close-choice variation, explanations, and separate application (D-023, D-029).
- Temporary state is sparse expiring context rather than a universal mood meter (D-024).
- Architecture rules apply retroactively, illustrative content does not become an exhaustive universe, and semantic end-to-end behavior—not structural presence—is the completion criterion (D-031 through D-033).
- Autonomous belief formation preserves independent conviction, salience, and flexibility; future autonomous rule consumers must resolve the effective rule for their actor, scope, authority, and simulated date (D-034, D-035).

### Validation Evidence

The completed Stage 4 gate passed formatting, lint, TypeScript checking, 95 tests across 12 files, the production build, and deterministic headless replay. `npm audit --audit-level=high` reported zero vulnerabilities, and `git diff --check` passed. Live in-app-browser inspection exercised progressive person materialization and time advancement, inspected personality, values, goals, appraisal, subjective perception, temporary state, decision traces, political reasoning, relationship history, event context, participants, known-by information, and claims, and found no browser console warnings or errors.

### Deliberately Deferred

At the Stage 4 checkpoint, biography facts did not carry append-sequence availability, so reconstructed historical perceptions excluded them away from the current frontier while durable traces froze any fact content used. Employer and education-institution names were compatibility text rather than canonical organization identity. Stage 5 later designed around that boundary with sequence-aware canonical work and education records without fabricating fact availability. Automatic perception, attention, communication, memory recall, character development, relationship behavior, population-scale opinion change, mutable law, and later gameplay systems remain deferred to their owning dependencies.

### Major Future Consumers

Stage 5 formative and adult life; Stage 6 causal events; Stage 7 effective law and institutions; Stage 8 population opinion; Stage 9 dialogue and campaigning; Stage 10 governing decisions; Stage 11 staff; and Stage 12 archives, Observer Mode, control transfer, and branching.

---

## Stage 5 — Formative Life, Adult Life, Households, Resources, and Organizations

Status: **COMPLETE**

### Purpose

Make a life playable from formative childhood through adulthood while giving politics durable personal stakes and shared institutional context.

### Adds

Formative resolution bands for ages 0–7, 8–12, and 13–17; adult life from approximately age 18; education, careers, military service, employment, relationships, romance, marriage/divorce, children, households, childcare, personal income/debt/resources, simple housing, time/rest/attention, stable organizations, relationship maintenance, and mentorship history.

Civilian and political paths create context, relationships, resources, expertise, opportunities, and durable history rather than profession-specific clerical minigames. Higher responsibility may create more consequential decisions per period without proportional busywork.

None of these systems are implemented in Stage 4.

### Internal Completion Runs

- **Run A — Shared Life-History and Participation Foundation — COMPLETED.** Incorporates the verified Stage 5.1 core-life checkpoint and adds organization-linked education, non-work participation, separate child authority, typed canonical-life sources, the legacy-biography compatibility boundary, and the eligibility-consumer seam.
- **Run B — Playable Life Paths and Character History — COMPLETED.** Adds one canonical played/quick/authored history-production boundary, sparse formative situations, persistent bounded social context, and compositional adult paths over Run A identities.
- **Run C — Personal Resources, Housing, Relationship Integration — COMPLETED.** Adds exact personal/household flows and positions, effective work compensation, major obligations/debt, structured affordability, stable dwelling/occupancy/tenure history, cross-household care/support flows, and meaningful relationship effort through ordinary history and Stage 4 evidence.

Stage 5 is **COMPLETE** after its three separately validated runs. Stage 6 is the next candidate and is not part of Stage 5.

### Run A — Shared Life-History and Participation Foundation

Status: **COMPLETED**

Run A retains the earlier Stage 5.1 stable-organization, work, household, kinship, partnership, care, time-demand, and load/recovery foundation and completes the shared identities required before playable formative or adult paths.

#### What Actually Landed

- Stable, provenance-bearing organization identity with effective-dated name/classification/location profiles, open content classification, and nondiegetic progressive detail.
- Multiple concurrent paid, unpaid, volunteer, independent, actual, or expected work relationships with separate effective-dated status and role/occupation histories plus authority, dependency, compensation, risk, location, and time-demand semantics.
- Stable households with dated locations and memberships, valid secondary/shared residence, rejected overlapping primary residence, and no conflation with dwellings or family.
- Separate stable kinship, active/ended partnership, and directed/shared cross-household care histories.
- Reusable expected-weekly ranges plus attention, concurrency, rigidity, interruptibility, and optional location constraints.
- Deterministic qualitative load assessment and seven-day push/recovery resolution over active work, care, and exceptional commitments, with fatigue represented through the existing Stage 4 temporary-state primitive.
- Date-plus-sequence queries, open taxonomy validation, progressive-person preservation, deterministic JSON and SQLite persistence, and semantic tests covering diverse international/public/private career patterns without named branches.
- A canonical-work-first coworker query and documented migration boundary for legacy textual occupation/residence/family summaries.
- Stable education enrollment linked to `Organization`, with expected/active/completed/withdrawn/transferred/ended state history, open program/context semantics, stable shared-school queries, and no universal grade/GPA/credential ontology.
- Stable non-work organization participation with expected/active/inactive/ended history and optional open role/context semantics; genuine volunteer work remains canonical work, and recurring activity load reuses life commitments.
- Separate effective-dated child authority whose holder may be a person or organization, without inference from kinship, care, co-residence, or partnership.
- Typed canonical-life source references for Stage 4 perception, appraisal provenance, decision evidence, and frozen trace snapshots, all guarded by actor ownership plus date-and-exclusive-sequence availability.
- A documented canonical-first `PersonFact` compatibility boundary that preserves existing facts/materialization without fabricating append sequence.
- An injectable deterministic eligibility consumer with structured allowed/blocked reasons and stable jurisdiction context, ready for later Stage 7 effective-rule resolution without containing a law table.

#### Major Architectural Decisions

- Research-gated bounded implementation runs (D-036).
- Stable life identities with effective-dated state, separated coincident concepts, and qualitative time/load semantics (D-037).
- Shared life history, participation, authority, typed evidence, and future-rule consumption (D-038).
- Canonical character-history composition and bounded life situations (D-039).

#### Validation Evidence

The completed Stage 5.1 plan preserves its exact 111-test checkpoint evidence. The completed Run A plan records the later full validation and semantic tests for grandparent care versus parent authority, relative guardians, agency custody, transfer/rename, teacher/former-student continuity, participation/work separation, backdated append safety, nondiegetic materialization, legacy facts, typed life sources, eligibility injection, open taxonomies, graph integrity, JSON, and SQLite.

#### Deliberately Deferred

Run B owns playable formative/adult paths, character-history construction, and education/career progression content. Run C owns finance/resources, housing/property, and relationship integration. Stage 6 owns the generalized event engine; Stage 7 owns mutable law/institutions and territory-specific legal/data content. Player scheduling UI, campaigns, elections, political office, government institutions, and legislation remain outside Run A.

### Run B — Playable Life Paths and Character History

Status: **COMPLETED**

Run B adds a typed `CharacterHistoryPlan` that applies played, deterministic quick-generated, and manually authored transitions through the existing canonical history writers. `generated` provenance distinguishes deterministic pre-play construction from authored and event-backed records without changing life semantics. Bounded context people are ordinary stable people; teachers use work at a school organization, peers share enrollment/participation, and mentorship/friendship/conflict remain derived from ordinary interaction and subjective history.

Formative content uses 0–7, 8–12, and 13–17 interval bands and a deliberately small starter set of household/school, peer, teacher, activity, civic, teen-work, and future-preparation situations. Situations append ordinary event, interaction, knowledge, memory, appraisal, temporary-state, and non-applying repeated-history development evidence as warranted. Teen work asks the injected eligibility provider. Adult helpers compose education/training, work, mentoring context, commitments, completion state, Guard/Reserve activation/return, and household relocation, including an open OCONUS location context.

Run B intentionally added no resource flows, compensation amounts, debt, housing/property, relationship upkeep, generalized event chains, mutable law/institutions, territory content, foreign-government simulation, or polished player UI. See the completed Run B plan for its checkpoint evidence.

### Run C — Personal Resources, Housing, and Relationship Integration

Status: **COMPLETED**

Run C implements the personal/household slice of the shared resource-flow contract with typed person/household/organization endpoints, exact integer-minor-unit money, effective expected/active/ended terms, and separate completed/partial/missed/blocked actual outcomes. Work compensation attaches to canonical work identity and produces money only when a pay period is explicitly resolved. Opening liquid positions plus committed outcomes derive historical capacity; active major obligations and bounded debt principal/payment history support structured available/strained/blocked affordability without a bank-account or credit-score simulator.

Stable dwellings are separate from household location, occupancy, and person/household tenure. Lease, ownership, hosting, assignment, nonresident ownership, non-tenure residence, household moves, and primary/secondary/shared occupancy compose the same primitives. Care and cross-household financial support use ordinary flows/obligations and infer no kinship, partnership, household membership, authority, or care.

Meaningful calls, visits, support, missed opportunities, and reconnection create ordinary event, relationship-interaction, knowledge, optional memory/appraisal, and time history. A qualitative derived continuity projection uses the full record without an upkeep meter, inactivity deletion, or automatic hostility. Explicit resource pressure can enter Stage 4 through actor-relevant typed evidence, knowledge, appraisal, temporary context, and decision sources. Played, quick-generated, and authored histories all use the same canonical writers; unrelated progressive materialization remains history-neutral.

Run C adds no campaign/organization/government finance, banking or credit-report simulation, property market, Stage 6 generalized event/economy engine, Stage 7 mutable law or territory data, foreign-government simulation, or polished UI. See D-040 and the completed Run C plan for the exact semantic and validation evidence.

---

## Stage 6 — World State, Metrics, Economy, Policy Effects, and Events

Status: **FUTURE**

### Purpose

Give later decisions and institutions a typed, causal world to observe and change without turning the simulation into an unrelated random-card deck.

### Adds

Typed historical world-state variables; lightweight economy; policy causal effects; delayed implementation and consequences; personal/local/state/national/international event prerequisites, blockers, modifiers, chains, follow-ons, and consequences; long-running conditions and storylines; actor-initiated events; and discovery, evidence, and secrecy foundations where appropriate.

Initial future metrics may cover housing, income, employment, crime, education, infrastructure, cost of living, government finance, natural disasters, disease outbreaks, political violence, major terrorist incidents, and economic shocks. Extraordinary outcomes remain causal and every committed occurrence still enters stable history through keyed deterministic resolution.

---

## Stage 6.5 — First Real UI and Diegetic Onboarding Shell

Status: **FUTURE**

### Purpose

Replace the diagnostic developer webpage with the first recognizable, functional political-RPG shell without claiming final art polish.

### Direction

The hierarchy is **scene first, dossier second, database third**. The current political or life moment occupies the center; a persistent player-controlled pin rail keeps approximately three to five tracked people, issues, or actions visible at right; and a compact Sims-like bottom-left anchor holds location, week/date/time, continue/advance, and compact navigation.

There is no full-width bottom navigation ribbon, permanent Political Capital number, or Webull/Bloomberg-style information wall. The current visual direction remains dark navy/charcoal with warm paper/wood and local civic identity.

Natural onboarding comes through the world: new-member orientation, experienced allies, party leadership, parliamentarians, city attorneys, clerks, transition officials, and agency briefings. Players can inspect a concept and later use an in-game civic reference. This direction replaces the diagnostic viewer only when Stage 6.5 begins; Stage 4 does not implement it.

---

## Stage 7A — Institutions, Law, Authority, and Mutable Rules

Status: **FUTURE**

### Purpose

Define generic institutional and legal architecture before adding jurisdiction-specific civic content.

### Adds

Jurisdictions, institutions, chambers, offices, seats, terms, eligibility, elections, appointments, confirmations, vacancies, succession, removal, powers, committees, procedures, voting thresholds, agenda authority, vetoes, overrides, and constitutional/statutory/internal-rule hierarchy. Rights, restrictions, effective dates, transition rules, redistricting, and boundary changes are first-class future requirements.

Institutions query the law or rule effective at the relevant simulated date. Generic code must not assume Lexington, Kentucky, or federal structure.

---

## Stage 7B — Real Lexington, Kentucky, and United States Civic Data

Status: **FUTURE**

### Purpose

Replace placeholder civic information with sourced, dated starting records over the generic Stage 7A architecture.

### Resolution and Additions

- Lexington-Fayette: high resolution.
- Kentucky: medium/high resolution.
- United States: lower initial resolution.
- A national county/county-equivalent skeleton for future geographic expansion.
- Government structure, offices, powers, terms, selection/election mechanisms, districts, councils, committees, executives, and reviewed officeholders where appropriate.
- Every sourced record preserves `as_of`, `source`, `jurisdiction`, `status`, and an official URL when available.

This provenance must later support inspect, explain, historical-version comparison, and an “open official source” workflow in the civic reference.

---

## Stage 8 — Population, Public Opinion, Reputation, and Electorate

Status: **FUTURE**

### Purpose

Simulate populations and electorates scalably without deeply simulating every voter or storing voter-by-every-proposition matrices.

### Consumes

Stage 3 propositions/beliefs, geography, politicians, public statements, world events, trusted cues, and evolving places.

### Adds

Population groups/cells, party identification, applicable principles, demographics, geographic traits, engagement, turnout propensity, political salience, candidate impressions, trusted people/organization cues, public narratives, opinion formation, split-ticket behavior, geographic fame/recognition/reputation, geographic change, and coalition evolution.

There is no single electorate partisan score and no dense voter x issue storage.

---

## Stage 9 — Parties, Campaign Finance, Campaigns, and Elections

Status: **FUTURE**

### Purpose

Make a Lexington council campaign playable through substantive choices and imperfect information.

### Adds

Party organizations; candidate decisions and recruitment; persistent campaign staff; separate personal and campaign accounts; jurisdiction-specific contribution, prohibited-source, party, PAC, public-financing, and self-funding rules; small-donor and major-donor strategies; fundraising; donors; volunteers; field activity; speeches; interviews; debates/forums; endorsements; opposition research; polling and fallible pollster interpretation; strategy; voter persuasion; enthusiasm; turnout; procedures; election-night presentation; results; and post-election consequences.

Campaigning communicates information and changes impressions, enthusiasm, organization, relationships, and turnout; it does not accumulate generic campaign points. Debates and interviews should eventually be contextual gameplay rather than passive modifiers.

---

## Stage 10 — Governing, Budgeting, Taxation, Legislation, Implementation, and Oversight

Status: **FUTURE**

### Initial Playable Scope

Lexington council.

### Adds

Structured measures and provisions; procedural legislative histories; drafting; explicit revisions, amendments, and substitutes; committees; hearings; scheduling and agenda authority; rule suspension; cloture where relevant; conference/concurrence; veto and override; lobbying/stakeholders; bargaining; promises and deals; whip assessments; obstruction; and hard votes.

Fiscal systems add taxes, revenue, appropriations, recurring versus one-time spending, restricted/general funds, reserves, debt and debt service, grants, capital spending, forecasts, fiscal notes, implementation, agency capacity, actual-versus-estimated effects, oversight, and ethics/investigation hooks. Fiscal effects must remain inspectable rather than collapsing into a single cost number.

Support must be explainable. An actor may support or oppose immediately, support after an amendment, require serious negotiation, or retain a hard substantive objection. Repeated meetings cannot automatically overcome substance. Major asks and conflicts can become long-term relationship and memory history.

---

## Stage 11 — Staff, Appointments, Administration, Delegation, and Mentorship

Status: **FUTURE**

### Adds

Persistent campaign aides, legislative aides, chiefs of staff, pollsters, speechwriters, communications staff, policy advisers, cabinet and other appointees, judicial nominees, diplomats, and senior administrators.

Staff and appointees can improve, decline, burn out, become loyal, disagree, leave, fail confirmation, run for office, and become politically important. Their primary value is better information, preparation, judgment, continuity, execution, and delegation capacity—not percentage-bonus equipment. Mentorship/protégé histories allow long-term political “coaching trees” to emerge from ordinary relationships rather than a special dynasty mechanic.

---

## Stage 12 — Civic Wiki, Archive, Observer Mode, and Branching

Status: **FUTURE**

### Purpose

Make decades of simulation explorable and causally understandable.

### Adds

Searchable people, places, laws, offices, procedures, cases, bills, political history, institutional history, current-versus-starting-world law, and official source links where available; person/career/place/party/faction/institution/election/legislation histories; historical maps; returning-player briefings; autonomous Observer Mode; following people/places/parties; switching the controlled persistent character; save branches with parent lineage; historical explanations; and political/mentor lineages.

A fifty-year simulation should explain why people rose or failed, places changed, parties realigned or emerged, and institutions transformed, including the earlier records that contributed.

---

## Stage 13 — Lexington Vertical-Slice Stabilization

Status: **FUTURE**

### Purpose

Pause expansion and make the Lexington slice reliable.

### Focus

Save integrity, deterministic bugs, performance, simulation speed, UI usability, pacing, long-simulation auditing, packaging, and regression testing on current macOS (including Apple Silicon) and 64-bit Windows. Keep platform-specific dependencies outside the simulation core and keep save/world formats cross-platform where practical.

---

## Post-Lexington Expansion

### Stage 14 — Kentucky Expansion

Additional Kentucky local governments, the General Assembly, statewide offices, governor, and higher-resolution Kentucky law, politics, geography, economy, and civic data.

### Stage 15 — Federal Political and Executive Expansion

Congress, the presidency, executive agencies and cabinet, federalism, national parties and campaigns, and national governing systems.

### Stage 16 — Judiciary, Legal Process, and Investigations

Judicial careers, courts, precedent, legal procedure, investigations, constitutional litigation, appointments, and changing constitutional interpretation.

### Stage 17 — National Macroeconomy and Capability Gate

National macroeconomic systems plus a fresh capability audit of the then-current _The Political Process_ before mature national United States scope is called broadly feature-complete.

### Stage 18 — Global Baseline, Diplomacy, and International Institutions

Countries, diplomacy, treaties, international organizations, global conditions, and the institutional baseline for foreign policy.

### Stage 19 — Strategic Conflict, Crisis Bargaining, and Intelligence

Strategic conflict, deterrence, intelligence, crisis bargaining, war initiation and termination, and long-running international consequences grounded in actors and conditions.

### Stage 20+ — Long-Run World and Content Expansion

Broader geography, institutions, careers, history starts, parties and realignments, family wealth and political dynasties, post-office life, contextual dialogue, and content depth. These possibilities do not change the current stage boundary.

## TPP Capability Floor

The contemporary version of _The Political Process_ is a rolling capability floor for the eventual broader United States political simulation, not this project's architectural model and never a source of proprietary implementation. The Lexington vertical slice does not wait for complete parity. Before the mature national game is called broadly feature-complete, perform a fresh capability audit and ensure important political capabilities are either matched or intentionally surpassed through another design.

---

## Long-Range Architecture Scenarios to Preserve

The architecture should let later stages add these scenarios without replacing stable world/person/history foundations:

1. An obscure county official can exist lightly for years, become a senator, gain detail, and retain every established fact.
2. A small childhood or teenage event can unlock a highly specific speech, debate, or interview response decades later.
3. Enthusiastic teenage marijuana use and use under intense peer pressure remain materially different contextual events.
4. One politician can change treatment of the player because of the player's prior action toward a third politician, subject to plausible knowledge.
5. Private belief, public claim, campaign promise, and later action can all differ and remain historically inspectable.
6. Years of study or work can produce obscure expertise that later matters politically.
7. A teenager can develop unusual expertise before entering politics.
8. A governor may deeply understand a state legislature while initially knowing little about Congress as president.
9. A decades-long staff relationship can accumulate personal/institutional knowledge while the staffer improves, declines, leaves, or starts a political career.
10. Reputation and familiarity can differ by geography, such as high recognition in Kentucky and mild recognition in Michigan.
11. Repeated activity in another state can matter after a later move or candidacy there.
12. A successful local coalition can gradually influence state or national coalitions.
13. Parties and factions can evolve organically.
14. New parties can emerge from plausible institutional, actor, voter, and event conditions.
15. Institutional rules and powers can change during a save.
16. Presidential power can expand or contract through statutes, courts, amendments, interpretations, norms, and conflict.
17. Political capital remains emergent leverage from popularity, relationships, mandate, institutional position, favors, party control, credibility, and context—not a visible spendable currency.
18. A leader may invest large amounts of time and leverage to force difficult legislation.
19. Another leader may be especially effective at obstruction rather than passage.
20. Former presidents and governors can remain powerful elder statespeople.
21. Families can pass wealth, relationships, famous names, enemies, expectations, and political reputations.
22. Dynasties emerge from repeated history rather than a dynasty score.
23. A dynasty member may sharply reject family expectations.
24. Observer Mode can run autonomously for decades without a player.
25. A player can later take control of a persistent NPC.
26. A branch save can explore an alternate decision without overwriting its parent timeline.
27. Identical starting situations can diverge radically while remaining causally understandable.
28. A returning player can reconstruct context through histories, notes, staff, media, and archives.
29. Staff and institutions can summarize routine political work so the player need not personally know every legislator.
30. Some legislation is easy, some needs one amendment, and some becomes a genuine political nightmare.
31. Consequential political sequences may consume substantial real-world play time because their decisions matter.
32. Quiet periods can resolve quickly.
33. A major crisis can transform a president's intended domestic agenda.
34. A player can deliberately initiate an intensive event such as a major negotiation.
35. Large event, belief, issue, and conditional-dialogue libraries can remain sparse and selectively evaluated.
36. Core simulation never requires runtime LLM or API calls.
37. Long-run history remains inspectable enough to explain why the world changed.

## Cross-Stage Integration Gate

Before implementing any new persistent concept, apply the checklist in [SYSTEM-DEPENDENCIES.md](SYSTEM-DEPENDENCIES.md). In particular, define its stable identity, authoritative history and provenance, typed queries, imperfect-information boundary, serialization behavior, geographic scope where relevant, sparse scaling strategy, and compatibility with the Constitution's ban on exposed universal scores.
