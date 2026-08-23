# Stage 4 Character Mind, Appraisal, and Autonomous Decisions

Status: ACTIVE

## Goal

Implement a general, deterministic, explainable character-mind and autonomous-decision foundation over the completed factual, subjective-history, belief, principle, and expertise systems. Prove the architecture with NPC political-belief formation as the first domain adapter without beginning Stage 5 or later gameplay.

## 1. Stage 3 Gate and Architecture Reconciliation

- [x] Read the repository authority hierarchy, completed plans, relevant simulation/persistence/viewer code, current tests, Git history, and the approved Stage 4 brief.
- [x] Run the complete Stage 3 validation gate, diff check, and dependency audit.
- [x] Create a standalone Stage 3 checkpoint commit before any Stage 4 changes.
- [x] Reconcile the Constitution, roadmap, dependency map, and decision log with the approved long-term architecture while labeling all Stage 5+ contracts as future.
- [x] Update current architecture and system contracts for the precise Stage 4 implementation boundary.

## 2. General Character-Mind Foundation

- [x] Add sparse, stable, append-oriented personality-tendency and value histories with definitions, categorical strength, provenance, effective dates, and supersession.
- [x] Add persistent structured goals with stable goal identity, priority/status history, targets/deadlines where applicable, and explicit completion/failure/abandonment/supersession.
- [x] Add event appraisals that preserve personal meaning separately from objective event truth and memory.
- [x] Add provenance-bearing subjective perceptions that reuse facts, memories, event knowledge, claims, relationships, trusted people, and prior inference without future leakage or omniscient truth access.
- [x] Add expiring temporary-state records as optional contextual inputs rather than player-facing mood meters.
- [x] Add non-applying development proposals for later gradual personality/value/goal/relationship development.
- [x] Add historical/as-of queries for all Stage 4 mind records.

## 2.5. Retroactive Architecture Integrity Gate

- [x] Add permanent stage-boundary architecture-integrity governance and record the retroactive, open-set, semantic-acceptance, and future rule-adaptation decisions.
- [x] Audit affected Stage 1–4 categorical schemas as closed semantic sets or open content taxonomies; correct accidental example-closure without replacing semantic types with arbitrary metadata.
- [x] Make decision-source provenance semantically namespaced and open-ended, including an honest opinion-readiness source for the no-opinion default.
- [x] Preserve Stage 3 belief-dimension independence when the Stage 4 adapter applies an autonomous private belief.
- [x] Run and record the retroactive Stage 1–4 audit, making only contained foundational corrections that should not compound into Stage 5.

## 3. General Decisions and Political Adapter

- [x] Implement reusable decision contexts, options, hard constraints, soft considerations, evaluations, outcomes, and explainable traces.
- [x] Use isolated keyed deterministic randomness only for close/uncertain choices; preserve order independence and make hard constraints absolute.
- [x] Separate evaluation, trace retention, autonomous NPC application, and canonical historical outcomes; protect player-controlled characters from silent major internal changes.
- [x] Implement political-belief formation as the first adapter over the general engine, using the existing sparse political schema and person-based relationship cues.
- [x] Support no opinion, defer, conflict, tentative support/opposition, and stronger support/opposition without collapsing private belief, public position, or commitment.

## 4. Persistence, Diagnostics, and Validation

- [x] Advance world and snapshot versions, validate the complete Stage 4 graph, and preserve JSON and Node-only SQLite round trips.
- [x] Extend deterministic demo fixtures and the developer person inspector for mind history, perceptions, temporary state, decision traces, and political reasoning without raw forbidden meters.
- [x] Add comprehensive acceptance coverage for all 44 required scenarios plus runtime/load integrity failures.
- [x] Run formatting, lint, TypeScript, all tests, production build, deterministic replay/demo, browser smoke testing, `git diff --check`, and dependency audit.
- [x] Reconcile final docs and exact validation evidence, mark Stage 4 complete in the roadmap, move this plan to completed, and create a separate Stage 4 checkpoint commit.

## Guardrails

- Stage 4 is a general character-mind and decision architecture; political belief formation is only its first adapter.
- No universal ideology, intelligence, friendship, political-capital, morality, corruption, fame, or exposed utility score is introduced.
- Personality, values, political principles, expertise, relationships, public positions, commitments, memories, appraisals, perceptions, decision traces, and canonical events remain distinct.
- NPC decisions use subjective information and never read unknown canonical truth.
- Player-controlled characters may receive evaluations or proposals, but major internal choices are never silently auto-applied.
- No childhood/life gameplay, careers, households, resources, organizations, parties, campaigns, elections, institutions, governing, finance, law, courts, crises, international systems, content-volume expansion, or polished player UI is implemented.
- The diagnostic viewer remains local and stateless; SQLite remains behind the Node-only persistence boundary.

## Completion Record

Completed 2026-08-22.

- Stage 3 remained isolated at checkpoint `466fee6`; Stage 4 was completed from the preserved working tree without rewriting that checkpoint.
- World schema advanced to 5, generator version to `demo-world-v5`, person materialization to version 4, and snapshot format to 4. JSON and Node-only SQLite round trips preserve the complete graph.
- The permanent Architecture Integrity Audit classified affected Stage 1–4 schemas and produced contained corrections: namespaced open content taxonomies, dotted event types, namespace-aware historical queries, provenance-bearing open decision sources, honest opinion-readiness semantics, explicit independent belief dimensions, and close-choice-only randomness.
- Validation passed formatting, lint, TypeScript, 95 tests across 12 files, production build, deterministic headless replay, `git diff --check`, and a dependency audit with zero vulnerabilities.
- Live developer-viewer inspection exercised materialization and time advancement; rendered personality, values, goals, appraisals, subjective perception, temporary state, decision traces, political reasoning, relationship history, event context, participants, known-by information, and claims; and produced no console warnings or errors.
- Deferred to dependency-owning future stages: biography append-availability migration, stable employer/institution entities, automatic perception/attention/communication/recall and character development, asymmetric relationship behavior, population-scale opinion change, mutable rules/law, and all Stage 5+ gameplay.
