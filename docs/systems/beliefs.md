# Beliefs

Political beliefs are sparse, proposition-specific, historical, and distinct from speech, commitments, behavior, knowledge, and expertise.

## Policy Catalog

The shared, data-driven `PolicyCatalog` separates reusable definitions from per-person state:

- domains group broad areas such as labor or healthcare;
- issues group related questions inside a domain;
- propositions describe a specific policy question, with stable IDs, parameters, and tags;
- knowledge subjects identify a structured topic at domain, issue, proposition, or technical scope; and
- principle definitions identify broad values without turning them into an ideology axis.

The implemented catalog is deliberately small synthetic scaffold content. The hierarchy and stable-ID validation are designed to grow to thousands of propositions without adding blank records to every person.

## Sparse Private Beliefs

`PropositionExposureRecord` is a separate sparse historical record that says a person encountered a specific proposition, when, by what source, and with what short contextual summary. It does not assert that the person formed a belief or made a public statement. This makes “never encountered,” “encountered but no formed view,” and “formed view” independently queryable without filling every person with blank issue fields.

`PrivateBeliefRecord` is an append-only statement of a person's formed private view on one proposition at one date. It stores:

- position: support, oppose, uncertain, or conflicted;
- conviction: tentative, moderate, strong, or settled;
- salience: low, moderate, high, or central;
- flexibility: open, negotiable, conditional, or firm;
- optional rationale;
- formation reason and optional typed references to proposition exposures, events, biography facts, memories, event knowledge, claims, relationship interactions, subject knowledge, durable decision traces, evidence, notes, or trusted cues; and
- an explicit link to the earlier record it supersedes.

Formation reasons and political-cue kinds are open content taxonomies expressed as validated semantic namespaces plus stable keys. New deliberation methods or community cues therefore do not require changing engine unions. Cue namespace determines provenance requirements: a `person:` cue requires a source person, while information, organization, media, and community cues do not masquerade as person-to-person communication.

Absence of a private-belief record means no formed belief is stored. It is not a hidden neutral value. Proposition exposure distinguishes unencountered questions from encountered questions with no formed view. Subject knowledge separately represents familiarity with the underlying topic. Uncertainty and conflict are explicit positions; tentativeness, low salience, and flexibility are separate dimensions; a withheld public position is speech, not private belief.

There is no universal liberal/conservative score, party-normalized bundle, or full proposition vector on a person. Related propositions may retain different positions, and unusual combinations are valid.

## Principles, Speech, Commitments, and Behavior

Broad `PrincipleRecord` entries use categorical stance, conviction, flexibility, qualification, provenance, and supersession. Principles may conflict or qualify one another. They never automatically generate proposition positions.

Private beliefs, `PublicPositionRecord` speech, and `CampaignCommitmentRecord` promises are separate append-only record families. A public position can support, oppose, remain undecided or conflicted, or be deliberately withheld. A campaign commitment has its own stance, strength, wording, and conditions. Neither record changes private belief. When either record cites a source event, that earlier-appended event must involve the person and share the statement or commitment date.

Historical behavior remains canonical event history and is not inferred from the other three layers. A full political-action classification is deferred until concrete gameplay actions exist.

## Knowledge and Expertise

`SubjectKnowledgeRecord` is separate from belief and stores categorical:

- familiarity/exposure;
- understanding;
- expertise;
- practical experience; and
- provenance from biography facts, lived events, study, a trusted report, or an explicit authored record.

Education and occupation facts reference stable subject IDs through catalog-defined materialization tags rather than hard-coded scaffold IDs. Queries can derive a categorical knowledge profile from those facts without manufacturing a political belief. When an explicit current subject-knowledge record exists, it is authoritative for the current categorical assessment and may revise an earlier assessment; factual biography remains visible as supporting evidence. Expertise means capability or experience, not ideological correctness, omniscience, or a guaranteed right answer. A person may be highly expert and uncertain, or poorly informed and strongly convinced.

## Queries and Integrity

Pure query APIs return proposition-exposure history and opinion state, private-belief history and current date-filtered beliefs, categorical private position, dated position changes, public positions at a date, campaign commitments, held principles, formed beliefs in a domain, resolved belief-formation references, subject knowledge, and practical experience. A formation's stable decision-trace IDs resolve through the Stage 4 decision queries. Queries use typed records and stable IDs rather than parsing prose. Mixed encounter evidence is ordered by effective date and then append sequence, so backfilled history cannot masquerade as the latest encounter. Domain-belief lookup walks a person's sparse history rather than every proposition in the catalog.

All political records share the world's contiguous history sequence and stable semantic-key identity. World integrity validates chronology, person/catalog references, categorical values, source provenance, perceived-information availability, and compatible supersession. A formation reference to an event is valid only when the person experienced it or the formation also cites their prior memory or knowledge of it. A decision-trace formation reference must identify the same actor and predate the belief in append order. Snapshot format 5 persists the catalog and every sparse history record through JSON and the Node-only SQLite repository.

## Autonomous Formation Adapter

The Stage 4 political adapter proves the general decision architecture with seven possible outcomes: no opinion, defer, conflicted, tentative support, support, tentative opposition, and opposition. It evaluates a stable historical cutoff, an existing private view when one exists, explicit provenance-bearing factors, hard constraints, and qualifying person-based cues. No opinion and defer create no private-belief record. Other outcomes append or supersede a private belief only when the proposal is explicitly applied to an NPC, and the new belief links to the durable decision trace that explains it. A substantive proposal supplies conviction, salience, and flexibility independently; equal positions can therefore differ in certainty, importance, and openness to revision.

A trusted-person factor requires a recipient perception backed by an earlier public communication about the proposition and relevant relationship interactions. The source person's private belief is never read as communication, and relationship closeness alone does not transfer a view. A cue is considered with the recipient's own confidence and source-credibility assessment rather than acting as a command.

The adapter has no universal personality-to-party, value-to-policy, principle-to-position, experience-to-position, or expertise-to-correctness mapping. It does not run a background population or time-step opinion simulation. Callers explicitly evaluate and, for NPCs only, apply a proposal. The controlled person's major internal choices cannot be autonomously applied. See [Mind and Decisions](mind-and-decisions.md).
