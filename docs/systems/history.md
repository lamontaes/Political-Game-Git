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
- Semantic event keys are stored and unique within a world; presentation-field or participant-order changes cannot create a duplicate occurrence.
- Existing records are not silently rewritten. Corrections, reinterpretations, and disputes are later linked records.
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
- public or private claims linked to an event and classified by their relationship to historical truth; and
- relationship interactions linked to the people and, when applicable, the source event.

All records have stable IDs and semantic keys. A claim or inaccurate secondhand belief can contradict an event without changing it. Versioned JSON snapshots preserve the complete graph, and the Node-only persistence adapter validates the graph before saving or after loading. Causal graphs, corrections, branching, knowledge propagation, and player-facing archive filtering remain future work.
