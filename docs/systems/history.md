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
- broad principle records with qualification and formation provenance; and
- structured subject-knowledge records with biography, event, study, trusted-report, or authored provenance;
- personality tendencies and personal values with catalog definitions, provenance, and explicit supersession;
- persistent goal-state histories retaining stable goal identity and terminal outcomes;
- event appraisals that preserve personal meaning separately from truth and memory;
- provenance-bearing perceptions and effective-dated temporary states; and
- durable decision traces that preserve evaluated options, blockers, conflicting considerations, outcome, and frozen source snapshots.

All records have stable IDs and semantic keys and share one contiguous append sequence. Each family is stored in append order rather than relying on a query-time sort to repair malformed history. A claim, inaccurate secondhand belief, public political position, campaign commitment, appraisal, or perception can contradict another record without changing it. Political and mind records may cite immutable event, biography, exposure, memory, perceived knowledge, claim, relationship, expertise, appraisal, perception, or earlier decision context without claiming that context mechanically caused the later state.

Integrity checks reject a cross-record reference whose target is not earlier in the global sequence, even when both records share a date; they also reject sources that postdate the record or expose canonical events the person neither experienced nor demonstrably knew. Durable decision traces freeze source labels and content used at evaluation time. A trace explains a selection but is not itself the canonical action or event produced by that selection.

Snapshot format 4 preserves the complete graph, shared policy and mind catalogs, and control state. The Node-only persistence adapter validates record order, discriminators, categorical values, chronology, provenance, historical cutoffs, source snapshots, and references before saving or after loading. Causal event graphs, automatic knowledge propagation and correction, autonomous character development, behavioral classification, branching, returning-player briefings, and player-facing archive filtering remain future work.
