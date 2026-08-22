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
deterministic world + stable identity + time
  -> durable person facts and contextual history
    -> sparse beliefs, principles, knowledge, and expertise
      -> bounded autonomous character decisions
        -> playable life/careers + coherent event engine
          -> game UI + sourced jurisdiction/institution data
            -> populations/electorates
              -> campaigns/elections
                -> governing/legislation
                  -> staff/delegation
                    -> archives/Observer Mode/branching
                      -> vertical-slice stabilization
```

Later systems must consume stable records and queries from earlier stages rather than replacing their identities or parsing presentation prose.

---

## Stage 1 — Foundation

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

Autonomous opinion formation and NPC decision-making, final personality and goal systems, political-action classification, campaigns, elections, legislation, Life Mode, the causal event engine, a large policy/content library, player-facing political dialogue, and polished game UI remain future-stage work.

### Major Future Consumers

Stage 4 NPC decisions; Stage 8 public opinion; Stage 9 dialogue, speeches, debates, interviews, and campaign commitments; Stage 10 legislative support; Stage 11 advisers; and Stage 12 historical archives.

---

## Stage 4 — Personality, Values, Goals, and Autonomous NPC Decisions

Status: **FUTURE**

### Purpose

Make persistent people capable of making their own imperfect, context-sensitive decisions when the player is not controlling them.

### Consumes

Factual biography/history, memories, relationships, Stage 3 beliefs/principles, substantive knowledge/expertise, and perceived rather than omniscient circumstances.

### Adds

Personality tendencies, values, goals, ambition and career goals, subjective perception, bounded rationality, imperfect confidence, emotions/context, habits, adviser-influence hooks, autonomous option evaluation, and bounded plausible randomness.

Decisions should be explainable from the NPC's perceived situation. Stage 4 must not collapse reasoning into a single ideology axis or global utility score and must not retroactively dictate player beliefs.

---

## Stage 5 — Life Mode, Detailed Time, Activities, and Civilian Careers

Status: **FUTURE**

### Purpose

Make adulthood from approximately age 18 onward playable as a life whose intensity changes with circumstances and responsibility.

### Adds

Life Mode, Detailed Mode, obligations, opportunities, discretionary activities, education, occupations, stable organizations, money/income hooks, family/personal activity, political volunteering, travel, expertise development, delegation hooks, and variable gameplay intensity.

Civilian paths may include education, skilled trades, law, accounting, food/hospitality, construction, medicine, nonprofits, journalism/media creation, entertainment, athletics, business ownership, inherited wealth, military service, civil service, and political staff. The simulation need not reproduce each profession's technical work; careers primarily create life context, relationships, income, expertise, opportunities, and history.

Higher responsibility may create more meaningful decisions per period without clerical busywork.

---

## Stage 6 — World and Event Engine

Status: **FUTURE**

### Purpose

Produce coherent personal, local, state, national, and international history from conditions, prior events, actors, and deliberate choices rather than an unrelated random-card deck.

### Adds

Event prerequisites, blockers, probability modifiers, conditions, chains, follow-ons, consequences, personal/local/state/national/international scopes, economic and political conditions, long-running storylines, actor-initiated events, and causal propagation.

A recession may deepen while underlying conditions persist; a president may initiate peace negotiations; war, attack, or another crisis may transform a planned governing agenda. All committed outcomes still use stable historical records and keyed bounded randomness.

---

## Stage 6.5 — First Real Game UI Shell

Status: **FUTURE**

### Purpose

Replace the diagnostic developer webpage with the first recognizable, functional political-RPG shell without claiming final art polish.

### Direction

Use an original identity centered on illustrated/stylized people, political dossiers, newspapers/media, calendars, government documents, dialogue encounters, maps, timelines, atmospheric political presentation, clear navigation, and more visual character than a spreadsheet-like political simulator. _Suzerain_ and _The Political Process_ are product-presentation comparisons; _Democracy 4_ is a secondary information-visualization reference. _Football Manager_ informs simulation/database depth, not the primary visual model. No proprietary implementation or assets may be copied.

Potential functional sections: Week, People, Government, Politics/Campaign, Media, World, and History.

---

## Stage 7 — Real Lexington and Kentucky Data

Status: **FUTURE**

### Purpose

Replace placeholder jurisdiction information with sourced, dated current starting data.

### Resolution and Additions

- Lexington-Fayette: high resolution.
- Kentucky: medium resolution.
- United States: lower initial resolution.
- Government structure, offices, powers, terms, selection/election mechanisms, districts, council, committees, mayor, and reviewed officeholders where appropriate.
- Every real dataset includes `as_of`, `source`, `jurisdiction`, and `status` provenance.

Jurisdiction rules belong in data, not generic code. Architecture must accommodate consolidated city-counties, council-manager and strong/weak mayor systems, partisan and nonpartisan elections, unusual legislatures/counties, judicial-selection differences, and lawful rule changes without requiring every municipality before the first playable slice.

---

## Stage 8 — Population, Public Opinion, and Electorate

Status: **FUTURE**

### Purpose

Simulate populations and electorates scalably without deeply simulating every voter or storing voter-by-every-proposition matrices.

### Consumes

Stage 3 propositions/beliefs, geography, politicians, public statements, world events, trusted cues, and evolving places.

### Adds

Population groups/cells, party identification, applicable principles, demographics, geographic traits, engagement, turnout propensity, issue salience, candidate impressions, trusted people/organization cues, opinion formation, split-ticket behavior, geographic change, and coalition evolution.

There is no single electorate partisan score and no dense voter x issue storage.

---

## Stage 9 — Campaigns and Elections

Status: **FUTURE**

### Purpose

Make a Lexington council campaign playable through substantive choices and imperfect information.

### Adds

Candidate decisions and recruitment, persistent campaign staff, fundraising, donors, volunteers, field activity, speeches, interviews, debates/forums, endorsements, opposition research, polling and fallible pollster interpretation, strategy, voter persuasion, enthusiasm, turnout, results, victory/defeat, and post-election consequences.

Campaigning communicates information and changes impressions, enthusiasm, organization, relationships, and turnout; it does not accumulate generic campaign points. Debates and interviews should eventually be contextual gameplay rather than passive modifiers.

---

## Stage 10 — Governing, Legislation, and Institutional Politics

Status: **FUTURE**

### Initial Playable Scope

Lexington council.

### Adds

Legislation composed from provisions, drafting, explicit revisions and amendments, fiscal/policy effects, committees, hearings, scheduling, agenda control, lobbying/stakeholders, bargaining, promises and deals, whip assessments, obstruction, routine and difficult legislation, hard votes, implementation hooks, and oversight hooks.

Support must be explainable. An actor may support or oppose immediately, support after an amendment, require serious negotiation, or retain a hard substantive objection. Repeated meetings cannot automatically overcome substance. Major asks and conflicts can become long-term relationship and memory history.

---

## Stage 11 — Staff, Advisers, and Delegation

Status: **FUTURE**

### Adds

Persistent chiefs of staff, legislative aides, campaign managers, pollsters, speechwriters, communications staff, policy advisers, and later executive staff.

Staff can improve, decline, burn out, become loyal, disagree, leave, run for office, and become politically important. Their primary value is better information, preparation, judgment, continuity, execution, and delegation capacity—not percentage-bonus equipment. Long tenure can create relationship and institutional knowledge while newer people may sometimes be more capable.

---

## Stage 12 — History, Observer Mode, Archive, and Branching

Status: **FUTURE**

### Purpose

Make decades of simulation explorable and causally understandable.

### Adds

Person, career, place, party, faction, institution, election, and legislation histories; historical maps; returning-player briefings; autonomous Observer Mode; following people/places/parties; taking control of a persistent NPC; and branch saves/worlds with parent lineage.

A fifty-year simulation should explain why people rose or failed, places changed, parties realigned or emerged, and institutions transformed, including the earlier records that contributed.

---

## Stage 13 — Vertical-Slice Stabilization

Status: **FUTURE**

### Purpose

Pause expansion and make the Lexington slice reliable.

### Focus

Save integrity, deterministic bugs, performance, simulation speed, UI usability, pacing, long-simulation auditing, packaging, and regression testing on current macOS (including Apple Silicon) and 64-bit Windows. Keep platform-specific dependencies outside the simulation core and keep save/world formats cross-platform where practical.

---

## Post-Vertical-Slice Expansion

Possible later expansion includes Lexington mayor; additional Kentucky local governments; the Kentucky legislature and statewide offices; governor; Congress and the presidency; executive agencies and cabinet; diplomacy, intelligence, party leadership, judicial careers, courts and precedent, federalism, institutional/rule changes, constitutional amendments, Supreme Court composition changes, more states and municipalities, thousands of propositions, expanded civilian/business/nonprofit/media/celebrity/athletic careers, family wealth and inheritance, political dynasties, factions and party realignment/new parties, long-run institutional transformation, elder-statesman and post-presidency play, historical starts, play-existing-politician mode, deeper character creation, very large contextual dialogue libraries, and expanded/generated visual assets.

These possibilities do not change the current stage boundary.

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
