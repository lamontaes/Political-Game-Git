# History

History is the durable, append-oriented explanation of the save world.

## Target Record

A meaningful historical record can preserve:

- what happened;
- when and where it happened;
- relevant context;
- participants, roles, and affected entities;
- witnesses and who later learned about it;
- later statements or claims about it;
- links to related events, decisions, provisions, relationships, and institutions.

Facts, memories, perceptions, and public claims are distinct. A false claim can be a real historical statement without becoming factual truth.

## Rules

- Historical records have stable IDs and simulated occurrence and recording timestamps.
- The global history sequence is contiguous, and every record-family array remains stored in strictly increasing append-sequence order.
- Cross-record formation, provenance, source, and supersession references point only to records that were already appended. A shared simulated date does not permit a reference to a later sequence.
- Historical mind and decision projections use both an as-of date and an exclusive global history-sequence cutoff, so later-appended backfill cannot influence an earlier evaluation.
- Semantic event keys are stored and unique within a world; presentation-field or participant-order changes cannot create a duplicate occurrence.
- Existing records are not silently rewritten. Corrections, reinterpretations, and disputes are later linked records.
- A memory requires either the person's direct involvement in its event or person-specific event knowledge appended before the memory. A superseding memory cannot be dated earlier than the memory it supersedes.
- Told-by, reported-by, trusted-cue, and trusted-report sources are other people, never the recipient or speaker describing themself as a third-party source.
- Unknown union discriminators and values outside a record's defined categorical vocabulary are rejected both when records are appended and when snapshots are integrity-checked on load.
- Person, place, institution, relationship, and archive histories are indexed views over shared records rather than contradictory copies.
- The player's visible history is filtered by plausible knowledge; a developer viewer may expose diagnostic truth when labeled.
- Old events remain available for contextual relevance years or decades later.
- Returning-player briefings are derived from durable history.
- Branches retain lineage to their parent state without mutating the parent.
- Real-world source history and simulated save history remain separate data domains.

## Implemented Record Families

The global history store uses one contiguous append sequence across:

- canonical events containing typed participants, visibility, tags, and structured context;
- subjective memories with strength, relevance tags, interpretation, and explicit supersession;
- per-person event knowledge with believed content, accuracy, confidence, and direct, told-by, public-record, media, or rumor provenance;
- public or private claims linked to an event and classified by their relationship to historical truth;
- relationship interactions linked to the people and, when applicable, the source event;
- proposition exposures recording that a person encountered a particular question and how, without implying a formed view;
- proposition-specific private beliefs with categorical dimensions, formation context, and supersession;
- public positions and campaign commitments that remain distinct from private belief;
- broad principle records with qualification and formation provenance;
- structured subject-knowledge records with biography, event, study, trusted-report, or authored provenance;
- personality tendencies and personal values with catalog definitions, provenance, and explicit supersession;
- persistent goal-state histories retaining stable goal identity and terminal outcomes;
- event appraisals that preserve personal meaning separately from truth and memory;
- provenance-bearing perceptions and effective-dated temporary states;
- durable decision traces that preserve evaluated options, blockers, conflicting considerations, outcome, and frozen source snapshots;
- organizations and effective-dated profiles;
- work relationships with separate expected/active/leave/ended status and role histories;
- education enrollments with separate expected/active/completed/withdrawn/transferred/ended state histories;
- non-work organization participations with separate expected/active/inactive/ended state histories;
- households with dated locations and membership/state histories;
- separate kinship, partnership/state, care-responsibility/state, and child-authority/state histories;
- exceptional life commitments and deterministic seven-day load resolutions;
- exact resource positions, flows, effective terms, actual transfer outcomes, major obligations, and obligation states;
- stable dwellings with separate occupancy/state and housing-tenure/state histories;
- exact jurisdiction/segment metric-state truth and explicit correction history;
- separate source-series observation vintages with compatible uncertainty and explicit revisions; and
- stable future due items with append-oriented scheduled/resolved/cancelled/blocked state and optional ordinary outcome-event links.
- stable causal processes with canonical sources/parents plus typed effect activations targeting metric/scope history.

All records have stable IDs and semantic keys and share one contiguous append sequence. Each family is stored in append order rather than relying on a query-time sort to repair malformed history. A claim, inaccurate secondhand belief, public political position, campaign commitment, appraisal, or perception can contradict another record without changing it. Political and mind records may cite immutable event, biography, exposure, memory, perceived knowledge, claim, relationship, expertise, appraisal, perception, or earlier decision context without claiming that context mechanically caused the later state.

Integrity checks reject a cross-record reference whose target is not earlier in the global sequence, even when both records share a date; they also reject sources that postdate the record or expose canonical events the person neither experienced nor demonstrably knew. A closed typed life-history reference covers the finite implemented Stage 5 record families while their education, participation, authority, resource, obligation, dwelling, occupancy, and tenure content keys remain open. Its resolver verifies record existence, actor involvement—including historically available household membership where appropriate—effective date, and append-sequence availability before perception, appraisal-provenance, or decision use. Durable decision traces freeze source labels and content used at evaluation time. A trace explains a selection but is not itself the canonical action or event produced by that selection.

Legacy `PersonFact` records remain embedded compatibility/background summaries. They retain their IDs and lack of append sequence; canonical Stage 5 histories take precedence when available, and no migration invents historical availability for facts produced by nondiegetic person materialization.

## Run B production and situations

Run B does not add a biography blob or `LifeEvent` truth family. A played, quick-generated, or manually authored `CharacterHistoryPlan` applies the same validated canonical transitions. Bounded situation definitions are content only; consequential choices append ordinary `HistoricalEvent`, relationship interaction, knowledge, memory, appraisal, temporary-state, and life records where warranted. Generated records use a typed deterministic provenance, and legitimate pre-play backdating still receives real current append sequence.

## Run C resources, housing, and relationship history

Run C adds no universal finance event or alternate relationship store. Exact opening position plus committed flow outcomes derives liquid history; expected terms and obligations are not treated as actual transfer. Dwellings, occupancy, and tenure are independent families rather than household/profile fields. Meaningful contact, missed opportunity, support, and reconnection use existing events/interactions/subjective records, while any continuity assessment remains an unstored qualitative projection.

Resource and housing roots/states/outcomes may be typed Stage 4 sources only when actor-relevant and available through both cutoff dimensions. An explicit missed or blocked outcome may support ordinary direct knowledge, appraisal, a bounded temporary resource-pressure state, perception, and decision evidence without creating a stress score. `CharacterHistoryPlan` delegates Run C transitions to the same canonical writers and removes its resolver-only stable-key references before writing.

Stage 6 Run A preserves quantitative truth separately from observations and subjective access. Metric corrections and observation revisions are later linked records; an observation can differ from truth without changing it. Neither record grants person knowledge until an explicit ordinary release/knowledge history path exists. Future due identity/state shares the same global sequence, while any due occurrence remains an ordinary `HistoricalEvent` rather than a parallel event store.

Stage 6 Run B preserves causal attribution separately from both occurrence truth and resulting metric state. A causal process cites canonical source/parent history; an effect activation cites one cause and target metric/scope; explicit evaluation is a projection until the normal metric writer commits a sourced result. Distinct-root queries deduplicate correlated branches without merging independent causes. These families grant no subjective access automatically.

Stage 6 Run C adds six sequence-aware quantitative policy families without creating another event or effect store. Baselines are counterfactual expectations, estimates are projections, and both remain separate from observations and metric truth. Alternatives and operations share projected causal identity, while only a separate realization may create actual Run B effects. One person's policy knowledge is an ordinary review event plus event-knowledge record and grants no access to anyone else.

Stage 6.5 Run C continues to use that same append-oriented history. Reading an
attached staff analysis records ordinary actor-specific policy-analysis review
events and knowledge. Choosing the prepared office version records one
duplicate-safe `office.working-draft-revised` event linking the controlled
person, jurisdiction, both alternatives, and both operations. The active paper
is projected from that exact event. No presentation-only selection, annotation,
comparison, or focus state enters history, and the drafting instruction is not
law or policy realization.

Snapshot format 11 preserves the complete graph, shared descriptive policy, mind, world-metric, and causal-mechanism catalogs, control state, Stage 5 life records, metric state/observations, causal processes/effect activations, quantitative policy histories, and future due histories in world schema 12. The Node-only persistence adapter validates record order, discriminators, exact quantities/units/money, chronology, provenance, lifecycle/supersession and correction/forecast-revision chains, causal ancestry/effect timing, historical cutoffs, typed source availability, exact resource/housing integrity, due references/outcome events, stored load derivation, source snapshots, and references before saving or after loading. Generalized incident/event graphs, automatic knowledge propagation and correction, autonomous character development, behavioral classification, branching, returning-player briefings, and player-facing archive filtering remain future work.
