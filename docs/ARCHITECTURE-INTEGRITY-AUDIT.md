# Architecture Integrity Audit

This audit is permanent development governance. Run it at every major stage boundary and whenever a new architecture rule, failure pattern, or invariant could affect completed work. Earlier stages are not grandfathered.

The audit does not authorize a broad rewrite. For every plausibly affected implementation, record one disposition:

1. confirmed compatible;
2. corrected now with a contained patch;
3. deferred through a concrete dependency-bound migration; or
4. rejected or superseded because retaining it would compound future work.

Stage completion requires semantic behavior, validation evidence, and documentation to agree. A stored interface, rendered diagnostic, placeholder, or graceful fallback is not by itself completed capability.

## Open and Closed Categories

Named examples are illustrative unless an authoritative specification explicitly closes the domain.

A **closed semantic set** is finite because its values define a state machine, a bounded scale, a persistence discriminator with distinct validation, or a supported record shape. Closed unions are appropriate for concepts such as goal lifecycle states, belief position/conviction/salience/flexibility, visibility, confidence, and provenance variants with different required fields.

An **open content taxonomy** classifies content that valid later adapters can extend without changing engine control flow. It must not be an arbitrary string or metadata bag. The current foundation uses validated semantic namespaces plus stable content keys for family relationships, event-participant roles, relationship-interaction kinds, belief-formation reasons, political-cue kinds, perception and decision subjects, and decision consideration sources. Event types use stable dotted content keys. Catalog-defined personality tendencies, their expressions, and personal values are also open by definition rather than exhaustively encoded in engine unions.

Open keys do not bypass provenance. Decision-source namespaces other than `context:` require at least one resolvable source reference; contextual sources still retain a stable key and explanation. New content keys may change trace vocabulary, but not scoring, constraint, chronology, or RNG semantics.

## Audit Checklist

- **Open-set and example safety:** Did illustrative examples become an exhaustive enum, switch, column set, or gameplay branch?
- **Overgeneric schema:** Did extensibility become an unvalidated string, `unknown`, arbitrary metadata, or prose that carries hidden semantics?
- **Semantic and end-to-end behavior:** Does the feature change simulation behavior as intended, rather than merely store or display a record?
- **Context correctness:** Are actor, simulated time, scope/jurisdiction, authority, subjective knowledge, and effective rules explicit where relevant?
- **Primitive reuse:** Did an adapter reuse the owning general primitive instead of creating a parallel subsystem?
- **Special-case detection:** Is a named historical/content example emerging from general rules rather than a bespoke branch?
- **Hard-coding:** Did Lexington, Kentucky, the United States, a current date, a current law, or one content example become engine ontology?
- **History:** Is reconstructable state append-oriented or explicitly effective-dated rather than destructively overwritten?
- **Provenance:** Are source, interpretation/status, availability time, and provenance represented and validated?
- **Stage leakage:** Did the change implement gameplay or domain entities owned by a future stage?
- **Fallback honesty:** Is a placeholder, diagnostic, manual fixture, or graceful fallback labeled as such rather than counted as completed simulation?
- **Supersession cleanup:** Was obsolete behavior removed or explicitly retained for a justified compatibility reason?
- **Determinism:** Are IDs, ordering, RNG scope, and replay independent of inspection and unrelated actors?
- **Progressive resolution and scaling:** Can low-resolution entities remain sparse and become detailed without rewriting established history?
- **Headless core:** Does the simulation remain independent of React, browser, SQLite, network, and runtime AI services?
- **Real-world/adversarial comb:** Do representative valid cases outside the design examples survive validation and produce meaningful behavior?
- **Rule-change adaptation (future contract):** When mutable law or rules arrive, do autonomous consumers resolve the effective rule for the actor, scope, and simulated date instead of assuming the original/default rule? This item constrains future work; it does not implement law or institutions now.

## Stage 1–4 Boundary Audit — 2026-08-22

| Area                                     | Disposition                        | Result                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stable IDs, time, RNG, headless boundary | Confirmed compatible               | IDs remain semantic-keyed; date arithmetic is UTC-safe; decision RNG is actor/decision/option keyed; browser and persistence adapters remain outside the simulation.                                                                                                                                                                                         |
| Biography record shapes                  | Confirmed closed                   | `PersonFact` is a closed union of currently supported typed record shapes, not a claim that all future biography concepts fit one generic bag. New shapes require explicit fields and validation. Family-relationship content within that shape was corrected to an open namespaced taxonomy.                                                                |
| Event content                            | Corrected now                      | Event types are validated dotted content keys; participant roles are an open namespaced taxonomy. Participant-role namespace queries prove an unanticipated facilitator role still behaves as personal experience. Context, truth, memory, knowledge, and claims remain separate.                                                                            |
| Relationship interaction content         | Corrected now                      | Interaction kind is open and namespaced. Work and conflict derivations consume semantic namespaces rather than enumerating only the original examples. Change and significance remain closed behavioral scales.                                                                                                                                              |
| Political formation provenance           | Corrected now                      | Formation reasons and cue kinds are open namespaced taxonomies. Cue/person consistency follows the semantic namespace, and cue-based reasons are not limited to one hard-coded trusted-cue value. Private belief, public position, and commitments remain separate.                                                                                          |
| Mind definitions and appraisal meanings  | Confirmed compatible               | Personality tendencies, expressions, personal values, appraisal meaning keys, goal domains, state keys, and tags are sparse/catalog or content-defined. Strength, confidence, valence, orientation, and lifecycle remain closed semantic sets.                                                                                                               |
| Perception and decision subjects         | Corrected now                      | Both reuse the same open namespaced subject type. Source variants remain a closed provenance discriminator because each variant has different access validation. Projection item kinds remain closed because each maps to a concrete persisted record family.                                                                                                |
| Decision consideration sources           | Corrected now                      | The prompt-derived exhaustive union was replaced with validated semantic namespaces and open keys. Every non-context source requires a resolvable reference; the no-opinion default is honestly labeled `context:opinion-readiness`.                                                                                                                         |
| Bounded randomness                       | Corrected now                      | Random influence is added only when at least two available options are within the close-choice window. Blocked and clearly separated options receive none.                                                                                                                                                                                                   |
| Autonomous political belief dimensions   | Corrected now                      | Position/outcome no longer aliases conviction, salience, and flexibility. A substantive proposal supplies the dimensions explicitly; only the semantic meaning of tentative versus non-tentative outcomes constrains conviction.                                                                                                                             |
| Player/NPC control                       | Confirmed compatible               | Control is simulation state, evaluation is non-applying, NPC application is gated, and controlled-person major mind changes require player-choice provenance.                                                                                                                                                                                                |
| Persistence and history                  | Confirmed with documented boundary | Stage 4 records and traces share append sequence and versioned snapshots. Biography facts still lack append-availability sequence; historical reconstruction therefore excludes them except at the current frontier and freezes used fact content in durable traces. A future biography-history migration must solve availability before relaxing that rule. |
| Real-world rules and jurisdictions       | Future migration under D-026/D-035 | Lexington remains explicitly synthetic. Mutable-law resolution and autonomous rule consumption belong to later institution/law dependencies and are not represented as completed Stage 4 capability.                                                                                                                                                         |
| Stage leakage and fallback honesty       | Confirmed compatible               | No Stage 5+ gameplay was added. Appointment, mentorship, testimony, and similar adversarial cases appear only as open content keys in tests, not as implemented domain systems.                                                                                                                                                                              |
