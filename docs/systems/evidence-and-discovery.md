# Evidence and Discovery

Stage 6 Run E adds a minimal objective evidence identity and one explicit bridge into person-specific information. An evidence artifact is world truth even when nobody has discovered it. Discovery records that one person encountered the artifact; it does not decide what the artifact proves.

## Objective artifacts

`EvidenceArtifactRecord` preserves a stable ID/key, global append sequence, open namespaced evidence kind, `createdAt` and `recordedAt`, sorted related entity IDs, closed access metadata, optional short description, and authored or simulated provenance. Run E related truth is deliberately bounded to an already committed `HistoricalEvent` or `IncidentRecord`. The event occurrence or incident onset cannot postdate artifact creation, and the related record must precede the artifact in the global sequence.

`recordEvidenceArtifact` canonicalizes IDs and provenance, appends exactly one artifact, and performs full world integrity validation. It creates no event, discovery, memory, perception, claim, or event-knowledge record. `public`, `restricted`, `private`, and `sealed` describe the artifact's objective access class only. Even a public artifact grants nobody knowledge automatically, and access metadata is not an ACL, permission engine, dissemination probability, or visibility rule.

Simulated artifact provenance requires at least one canonical source and may cite only available related source truth. Authored provenance requires a nonblank note. Evidence kind remains an open validated semantic key so later content can add classifications without widening a closed engine union.

## Explicit discovery and knowledge

`EvidenceDiscoveryRecord` links one existing person to one available artifact with `discoveredAt`, `recordedAt`, an open discovery-method key, an ordinary discovery event, provenance, and the global sequence. A person/artifact pair may be discovered only once. The writer rejects a missing person, a pre-birth encounter, or a person whose death is available at the discovery date and creation frontier.

`recordEvidenceDiscovery` commits one exact ordered path:

1. an ordinary private `evidence.discovered` `HistoricalEvent` involving exactly the person and artifact, with the person participating as `observation:evidence-discovery`;
2. the `EvidenceDiscoveryRecord`; and
3. one accurate, high-confidence, direct `EventKnowledgeRecord` for that person about the discovery event, using the canonical stable key `${discoveryStableKey}:knowledge`.

Integrity reconstructs the canonical event and knowledge identities, dates, participants, involved entities, summary, provenance, and adjacent event → discovery → knowledge sequence. Every reserved `evidence.discovered` event must have exactly one matching discovery record, so a generic event cannot imitate discovery without its domain and knowledge path. The discovery record intentionally stores no knowledge ID and therefore creates no forward reference; integrity derives the expected knowledge ID from the discovery stable key.

This path guarantees only that the discoverer knows they encountered the artifact. It does not grant knowledge of every related event or incident, does not interpret the artifact's meaning, and does not teach another person. Any later memory, appraisal, perception, claim, communication, or decision input must use the ordinary Stage 4 information paths and their own provenance rules.

## Historical cutoffs and queries

Evidence uses the same two-dimensional historical boundary as the rest of the append-oriented simulation. Artifact availability requires `createdAt <= cutoff.asOfDate` and `artifact.sequence < cutoff.historySequenceExclusive`. Discovery availability uses `discoveredAt` and the same exclusive sequence rule. `recordedAt` preserves valid record chronology and cannot precede the effective date or exceed the current world date; it does not erase legitimate backfill or replace the exclusive append frontier.

The bounded public query surface provides:

- `evidenceArtifactAt` / `evidenceArtifactAtCutoff`;
- `evidenceArtifactsRelatedToEntity`;
- `hasPersonDiscoveredEvidence`; and
- discovery history filtered by person and/or artifact.

The date dimension prevents pre-creation or pre-discovery visibility. The sequence dimension prevents a later-appended backfilled artifact or discovery from leaking into a projection evaluated before it was appended.

## Integrity, persistence, and module boundaries

`src/simulation/evidence.ts` owns writers and cutoff queries. `src/simulation/evidence-integrity.ts` owns independent history enumeration, stable identity, entity existence/availability, chronology, source, duplicate, event, knowledge, provenance, and cutoff-safe cross-link validation. The integrity module depends on types, dates, IDs, and the vitality availability query; it does not import `world.ts`. `world.ts` composes the integrity helpers into the global entity resolver, contiguous sequence, global ID set, ordinary-event reference checks, and persistence boundary.

Evidence artifacts and discoveries are ordinary `HistoryStore` families in world schema 14 and generator `demo-world-v14`. Snapshot format 13 preserves them together with vitality catalog v1, mortality/capacity history, and all earlier Stage 4–6 records. The JSON codec and Node-only SQLite repository validate and round-trip the complete world; evidence adds no browser, React, SQLite, or external-service dependency to the pure simulation.

Focused Run E tests prove zero-knowledge artifacts, event/incident source identity, access persistence, explicit one-person discovery knowledge, cutoff-safe backfill, vitality boundaries, malformed cross-link rejection, and exact JSON round-trip. The permanent maximum-current test in `stage-5-run-c.test.ts` preserves one continuous Stage 5 → Run E history, including incident-related evidence, one-person discovery, capacity changes, mortality/death, exact JSON replay, and SQLite save/load/list/replacement.

## Deliberate limits

Run E adds no file/blob store, document renderer, chain-of-custody model, investigative search or reasoning engine, media/newsroom system, source-trust score, subpoena, warrant, discovery procedure, court process, public-record request, access-control list, permission inheritance, or automatic knowledge propagation. Later systems may consume these stable artifacts and ordinary person-information records, but they must not reinterpret access metadata as knowledge or replace canonical event/incident truth.
