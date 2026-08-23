# Mind and Decisions

The character-mind foundation represents who a person has become, what an experience means to them, what they think is happening, and how an NPC can make an explainable choice. It does not reduce a person to one score or make every historical fact psychologically active.

## Separation of Concepts

The following layers remain distinct:

- factual biography and canonical events describe established history;
- memories describe a person's remembered account;
- event knowledge and perceptions describe information available to that person;
- appraisals describe the personal meaning assigned to an event;
- personality tendencies describe recurring patterns, not moral worth or destiny;
- personal values describe what matters to the person;
- political principles and proposition beliefs remain the separate political records defined in [Beliefs](beliefs.md);
- goals describe desired outcomes and their lifecycle;
- temporary states describe expiring context; and
- decision evaluations explain a proposed selection, while canonical actions and consequences belong to their own domain histories.

No layer automatically generates another. In particular, an event does not necessarily create an appraisal, a repeated experience does not silently change personality, a value does not imply a policy position, and a decision trace is not an event.

## Sparse Mind Histories

The versioned `MindCatalog` defines stable personality-tendency definitions, allowed expressions, and personal-value definitions once per world. Per-person state remains sparse: only records that have actually been established are stored.

Personality-tendency records preserve the definition and expression, categorical strength and confidence, contextual scope tags, date, provenance, and an explicit link when a current record supersedes an earlier one. A definition may be unipolar or have multiple expressions; the system does not assume that every tendency is a single positive/negative axis.

Personal-value records preserve categorical orientation, strength, salience, optional qualification, date, provenance, and supersession. Values may conflict. They remain distinct from personality, political principles, proposition beliefs, expertise, and public speech.

Goals retain a stable goal identity across append-only state records. A state includes objective, domain, scope, priority, status, optional target and deadline, provenance, and optional outcome. Goals may begin as proposed or active and later become completed, failed, abandoned, or superseded. Terminal states are not silently reopened, and one goal may explicitly replace another.

Materializing a lightweight person does not invent personality, values, goals, appraisals, or decisions. Later progressive detail must preserve every established mind record and stable person ID.

## Appraisal and Perception

An appraisal links one person to an earlier event they experienced or plausibly know. It preserves one or more labeled meanings with valence and intensity, an interpretation, confidence, involved people, provenance, and optional memory or event-knowledge context. Different people may appraise the same event differently. A later reinterpretation explicitly supersedes an earlier appraisal without changing the event, memory, or prior appraisal.

An explicit perception records a proposition the person believes about an entity, mind record, context, or domain subject. Subject kinds use validated semantic namespaces with open stable content keys, so appointment processes or future domain subjects do not require expanding a prompt-derived enum. It preserves the assertion, confidence, assessed source credibility, provenance, and optional supersession. Perception-source variants remain a closed union because each variant has distinct access and integrity rules. Supported sources include the person's facts, proposition exposures, subject knowledge, appraisals, event knowledge, memories, heard claims, earlier perceptions used as inference, communicated cues from another person, relationship-derived impressions, typed canonical life-history records, and explicit authored fixtures.

Person-to-person cues require evidence of communication and the relevant relationship history. A close relationship is not universal trust, public visibility is not automatic knowledge, and another person's private belief is never treated as communicated information. Diagnostic truth or an event-knowledge accuracy classification may be available to integrity and developer tools but is not an input the character can inspect.

`buildSubjectivePerception` creates a deterministic as-of projection from information actually available to one person: their eligible biography facts, memories, event knowledge, accessible claims, relationship episodes, proposition exposures, subject knowledge, appraisals, explicit perceptions, and active temporary states. It can preserve contradictory items; it does not collapse them into an omniscient answer.

Historical evaluation uses a `HistoricalCutoff` containing both an as-of date and an exclusive global history sequence. Both must be satisfied. This prevents a later-appended, backdated history record from leaking into a decision that was evaluated earlier. Biography facts do not carry append-sequence availability, so the subjective builder and decision-source validator include them only at the world's current date and current end-of-history frontier; durable traces freeze any factual source content used there. Reconstructing an older cutoff cannot introduce a biography fact whose availability at that time is unprovable. Canonical Stage 5 sources use a closed typed record-family reference; validation requires the record to exist, involve the actor, and precede both cutoff dimensions.

## Temporary States and Development Proposals

Temporary-state records are sparse, provenance-bearing contextual inputs such as stress, fatigue, grief, fear, anger, or excitement. Each uses a non-empty half-open interval, `[startsAt, endsAt)`, categorical intensity, and tags identifying decisions where it may matter. An expired state remains historical but is absent from a later subjective-perception projection. Temporary state is not a universal mood engine or player-facing meter.

A development proposal can suggest strengthening, softening, reconsidering, activating, or retiring a personality, value, goal, or relationship direction. It has stable identity, provenance, rationale, and an optional repetition key. It is deliberately non-persistent and non-applying in this stage. A proposal concerning the controlled person is marked as requiring player choice.

## Historical Queries

`currentHistoricalCutoff` creates the current date-and-sequence boundary. `personalityTendencyHistory`, `personalValueHistory`, `goalStateHistory`, `appraisalHistory`, `explicitPerceptionHistory`, and `decisionTraceHistory` reconstruct their respective histories through any valid cutoff. Companion latest-record and per-person helpers resolve effective sparse state; `activeGoalStatesAt` and `activeTemporaryStatesAt` apply lifecycle/effective-date rules; `explicitPerceptionsAbout` filters one subject; and decision traces can resolve by decision or trace identity.

Every historical query applies both cutoff dimensions. History queries retain superseded records, while latest-state helpers select the final record from an integrity-validated linear history. Active temporary-state lookup uses the same half-open interval as subjective perception. Returned records retain their source IDs so archives and explanations can resolve the original evidence without parsing prose.

## General Decision Evaluation

The reusable evaluator accepts:

- a stable decision identity, actor, subject, and historical cutoff;
- at least two stable options;
- hard constraints that block named options;
- supporting or opposing soft considerations with categorical importance and confidence;
- an open, semantically namespaced source key for each consideration, resolvable provenance references where the source is record-, social-, institution-, or domain-backed, and any explicit perception records considered;
- a randomness policy; and
- an ephemeral or durable trace-retention policy.

Hard constraints are applied before comparison and cannot be outweighed. Soft considerations may conflict, and every applicable consideration remains in the explanation. Internal comparison weights are an implementation detail, not a player-facing utility score.

Decision subjects reuse the same open subject taxonomy as perceptions. Consideration sources use validated `mind`, `belief`, `information`, `social`, `context`, `institution`, and `domain` namespaces with open stable keys. Every non-context source requires at least one resolvable source reference. A contextual premise may have no stored source record, but it still needs an honest stable key and explanation; the adapter's default reason to leave an opinion unresolved is therefore `context:opinion-readiness`, not a mislabeled risk.

When enabled, random influence is slight and limited to a set of at least two available options already within the close-choice window. Clearly separated and blocked options receive none. It comes from the world seed, stable decision and actor IDs, and an option-keyed fork. Reordering options, inspecting UI, materializing a person, evaluating another actor, or changing unrelated random consumption cannot alter the result. A fully blocked context reports that no option is available.

Evaluation is pure and produces a proposal-like `DecisionEvaluation`. A durable evaluation may be appended as a `DecisionTraceRecord` only if history still matches its cutoff; a stale evaluation must be recomputed. The trace freezes the options, blockers, considerations, qualitative preference and bounded-random contribution, selected or unavailable outcome, and labeled source snapshots used at evaluation time.

A trace explains why an option was selected or blocked. It is not the selected action, an event, or a consequence. A domain adapter applies any consequential state change separately and records that result exactly once in the proper history family. Routine evaluations may remain ephemeral.

## Political-Belief Adapter

Political belief formation is the first adapter over the general engine, not a special-purpose replacement for it. It evaluates seven outcomes: no opinion, defer, conflicted, tentative support, support, tentative opposition, and opposition.

Inputs may include the actor's prior belief and explicit, provenance-bearing factors from their subjective context. A trusted-person factor must be backed by the recipient's perception, an earlier public communication about that proposition, and relationship evidence. Relationship closeness alone does not copy a view, and the adapter never reads the source person's private belief.

No opinion and defer are real outcomes: applying either records the durable reasoning trace but creates no private-belief record. Other applied NPC outcomes append or supersede the proposition-specific private belief and link its formation context to the earlier trace. The selected outcome determines the position side, while the caller supplies conviction, salience, and flexibility independently. Tentative outcomes require tentative conviction, but salience and flexibility remain independent, and non-tentative support or opposition does not imply strong conviction, high salience, or one flexibility. Private belief, public position, campaign commitment, political principle, expertise, and behavior remain separate.

The adapter does not encode universal value-to-policy, personality-to-party, expertise-to-correctness, or experience-to-position mappings. Sparse inputs can produce uncertainty, conflict, or no formed view. Two people with different perceptions or appraisals may reach different outcomes from the same canonical event.

## Player Autonomy and Control

The world stores explicit observer or controlled-person state. Autonomous application is permitted only for NPCs. The engine may evaluate a controlled person's situation or create a non-applying development proposal, but it cannot silently apply a major private belief or character-development choice for that person. Selecting a person in the developer viewer is inspection only and does not change control.

## Integrity, Persistence, and Diagnostics

All persistent mind records and durable decision traces share the world's contiguous append sequence, stable semantic-key identity, and append-family order. Integrity checks validate person and catalog references, chronology, categorical vocabularies, linear supersession, goal lifecycles, source availability before the historical cutoff, non-self third-party sources, communication and relationship provenance, temporary intervals, decision source snapshots, and control references.

Stage 5 life-load resolution reuses this system by appending `life:fatigue` as an ordinary temporary state whose provenance resolves to the earlier load-resolution record. It does not create a second fatigue or mood store, and an unresolved load assessment does not mutate the mind.

World schema 7 and snapshot format 6 preserve the mind catalog, control state, all Stage 4 history families, Run A life records, typed life-history source references, and the complete decision trace through deterministic JSON and Node-only SQLite round trips. Unsupported older versions remain rejected until migrations exist.

The developer viewer may show diagnostic truth beside subjective appraisal or perception only when clearly labeled. It presents categorical descriptions and source explanations, never raw personality, relationship, trust, ideology, utility, or random numbers.

## Deferred Systems

The current foundation does not implement formative-life gameplay, autonomous personality development, autonomous memory recall, relationship-maintenance behavior, career content/progression, resources, housing, event causality, institutions and mutable law, elections, campaigns, legislation, public-opinion populations, dialogue, or a polished player UI. Run A education, participation, child authority, organizations, work histories, households, care, and load resolution may consume mind context but do not silently create beliefs, values, goals, or appraisals. Later systems may consume this architecture without redefining its separation, provenance, determinism, history, or player-autonomy contracts.
