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
- formation reason and optional typed references to proposition exposures, events, biography facts, memories, event knowledge, claims, relationship interactions, subject knowledge, evidence, notes, or trusted cues; and
- an explicit link to the earlier record it supersedes.

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

Pure query APIs return proposition-exposure history and opinion state, private-belief history and current date-filtered beliefs, categorical private position, dated position changes, public positions at a date, campaign commitments, held principles, formed beliefs in a domain, resolved belief-formation references, subject knowledge, and practical experience. Queries use typed records and stable IDs rather than parsing prose. Mixed encounter evidence is ordered by effective date and then append sequence, so backfilled history cannot masquerade as the latest encounter. Domain-belief lookup walks a person's sparse history rather than every proposition in the catalog.

All political records share the world's contiguous history sequence and stable semantic-key identity. World integrity validates chronology, person/catalog references, categorical values, source provenance, perceived-information availability, and compatible supersession. A formation reference to an event is valid only when the person experienced it or the formation also cites their prior memory or knowledge of it. Snapshot format 3 persists the catalog and every sparse history record through JSON and the Node-only SQLite repository.

## Deferred Formation Behavior

This stage does not implement an NPC opinion engine. Life events, principles, knowledge, relationships, and trusted cues are available as explicit context, but no runtime automatically changes beliefs and no generated personality determines them. Trusted-cue provenance can distinguish expert information, politicians, parties, organizations, family, unions, churches, journalist/media sources, social contacts, and unknown sources; a person-valued cue must identify someone other than the person forming the view, and no cue propagates an opinion by itself. Player beliefs are never assigned from a personality generator.

The recommended next engineering task is: **Implement a deterministic, explainable NPC belief-formation proposal evaluation service that consumes sparse beliefs, principles, subject knowledge, relevant experiences/memories, cues, relationships, constituency/incentives, and keyed RNG to emit proposed append-only belief changes with reason traces—without automatically applying them to player characters.**
