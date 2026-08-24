import { makeIsoDate } from "./dates";
import {
  EVIDENCE_DISCOVERY_EVENT_TAG,
  EVIDENCE_DISCOVERY_EVENT_TYPE,
  EVIDENCE_DISCOVERY_PARTICIPANT_ROLE,
  evidenceDiscoveryEventStableKey,
  evidenceDiscoveryKnowledgeStableKey,
  evidenceDiscoverySummary,
  evidenceEntityAvailableAt,
} from "./evidence-integrity";
import { createStableId } from "./ids";
import { recordEventKnowledge } from "./records";
import type {
  EntityId,
  EvidenceAccess,
  EvidenceArtifactRecord,
  EvidenceDiscoveryRecord,
  EvidenceRecordProvenance,
  EvidenceSemanticKey,
  HistoricalCutoff,
  World,
} from "./types";
import { isPersonAliveAt } from "./vitality-integrity";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

export interface RecordEvidenceArtifactInput {
  readonly stableKey: string;
  readonly evidenceKind: EvidenceSemanticKey;
  readonly createdAt: string;
  readonly recordedAt: string;
  readonly relatedEntityIds: readonly EntityId[];
  readonly access: EvidenceAccess;
  readonly description: string | null;
  readonly provenance: EvidenceRecordProvenance;
}

export interface RecordEvidenceDiscoveryInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly evidenceArtifactId: EntityId;
  readonly discoveredAt: string;
  readonly recordedAt: string;
  readonly methodKey: EvidenceSemanticKey;
  readonly provenance: EvidenceRecordProvenance;
}

export interface EvidenceDiscoveryQuery {
  readonly personId?: EntityId;
  readonly evidenceArtifactId?: EntityId;
}

export function recordEvidenceArtifact(
  world: World,
  input: RecordEvidenceArtifactInput,
): World {
  assertWorldIntegrity(world);
  if (
    world.history.evidenceArtifacts.some(
      (artifact) => artifact.stableKey === input.stableKey,
    )
  ) {
    throw new Error(`Duplicate evidence artifact key: ${input.stableKey}`);
  }
  const artifact: EvidenceArtifactRecord = {
    id: createStableId("evidence-artifact", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    evidenceKind: input.evidenceKind,
    createdAt: makeIsoDate(input.createdAt),
    recordedAt: makeIsoDate(input.recordedAt),
    relatedEntityIds: canonicalIds(input.relatedEntityIds),
    access: input.access,
    description: input.description,
    provenance: cloneProvenance(input.provenance),
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      evidenceArtifacts: [...world.history.evidenceArtifacts, artifact],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

export function recordEvidenceDiscovery(
  world: World,
  input: RecordEvidenceDiscoveryInput,
): World {
  assertWorldIntegrity(world);
  const discoveredAt = makeIsoDate(input.discoveredAt);
  const recordedAt = makeIsoDate(input.recordedAt);
  if (discoveredAt > recordedAt || recordedAt > world.currentDate) {
    throw new Error("Evidence discovery has impossible chronology.");
  }
  const person = world.people[input.personId];
  if (!person) {
    throw new Error(`Missing evidence discoverer: ${input.personId}`);
  }
  const artifact = world.history.evidenceArtifacts.find(
    (record) => record.id === input.evidenceArtifactId,
  );
  if (
    !artifact ||
    !evidenceEntityAvailableAt(
      world,
      input.evidenceArtifactId,
      discoveredAt,
      world.history.nextSequence,
    )
  ) {
    throw new Error(
      `Evidence artifact is unavailable at discovery: ${input.evidenceArtifactId}`,
    );
  }
  if (
    !isPersonAliveAt(world, person.id, {
      asOfDate: discoveredAt,
      historySequenceExclusive: world.history.nextSequence,
    })
  ) {
    throw new Error(`Evidence discoverer is not alive: ${person.id}`);
  }
  if (
    world.history.evidenceDiscoveries.some(
      (discovery) =>
        discovery.stableKey === input.stableKey ||
        (discovery.personId === input.personId &&
          discovery.evidenceArtifactId === input.evidenceArtifactId),
    )
  ) {
    throw new Error(
      "Evidence discovery key or person/artifact identity already exists.",
    );
  }

  const eventStableKey = evidenceDiscoveryEventStableKey(input.stableKey);
  const summary = evidenceDiscoverySummary(artifact);
  let working = recordWorldEvent(world, {
    stableKey: eventStableKey,
    type: EVIDENCE_DISCOVERY_EVENT_TYPE,
    occurredAt: discoveredAt,
    recordedAt,
    jurisdictionId: null,
    involvedEntityIds: [person.id, artifact.id],
    participants: [
      {
        personId: person.id,
        role: EVIDENCE_DISCOVERY_PARTICIPANT_ROLE,
        detail: null,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [EVIDENCE_DISCOVERY_EVENT_TAG],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = createStableId("event", `${world.id}:${eventStableKey}`);
  const event = working.history.events.find((record) => record.id === eventId);
  if (!event) {
    throw new Error("Evidence discovery event was not committed.");
  }

  const discovery: EvidenceDiscoveryRecord = {
    id: createStableId("evidence-discovery", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: working.history.nextSequence,
    personId: person.id,
    evidenceArtifactId: artifact.id,
    discoveredAt,
    recordedAt,
    methodKey: input.methodKey,
    discoveryEventId: event.id,
    provenance: cloneProvenance(input.provenance),
  };
  working = {
    ...working,
    history: {
      ...working.history,
      nextSequence: working.history.nextSequence + 1,
      evidenceDiscoveries: [...working.history.evidenceDiscoveries, discovery],
    },
  };

  working = recordEventKnowledge(working, {
    stableKey: evidenceDiscoveryKnowledgeStableKey(input.stableKey),
    personId: person.id,
    eventId: event.id,
    learnedAt: discoveredAt,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  assertWorldIntegrity(working);
  return working;
}

export function evidenceArtifactAtCutoff(
  world: World,
  artifactId: EntityId,
  cutoff: HistoricalCutoff,
): EvidenceArtifactRecord | null {
  validateCutoff(world, cutoff);
  const artifact = world.history.evidenceArtifacts.find(
    (record) => record.id === artifactId,
  );
  return artifact && artifactAvailable(artifact, cutoff)
    ? structuredClone(artifact)
    : null;
}

export const evidenceArtifactAt = evidenceArtifactAtCutoff;

export function evidenceArtifactsRelatedToEntity(
  world: World,
  relatedEntityId: EntityId,
  cutoff: HistoricalCutoff,
): readonly EvidenceArtifactRecord[] {
  validateCutoff(world, cutoff);
  return world.history.evidenceArtifacts
    .filter(
      (artifact) =>
        artifact.relatedEntityIds.includes(relatedEntityId) &&
        artifactAvailable(artifact, cutoff),
    )
    .map((artifact) => structuredClone(artifact));
}

export const evidenceArtifactsRelatedToEntityAt =
  evidenceArtifactsRelatedToEntity;

export function hasPersonDiscoveredEvidence(
  world: World,
  personId: EntityId,
  evidenceArtifactId: EntityId,
  cutoff: HistoricalCutoff,
): boolean {
  validateCutoff(world, cutoff);
  return world.history.evidenceDiscoveries.some(
    (discovery) =>
      discovery.personId === personId &&
      discovery.evidenceArtifactId === evidenceArtifactId &&
      discoveryAvailable(discovery, cutoff),
  );
}

export const hasPersonDiscoveredEvidenceAt = hasPersonDiscoveredEvidence;

export function evidenceDiscoveryHistory(
  world: World,
  query: EvidenceDiscoveryQuery,
  cutoff: HistoricalCutoff,
): readonly EvidenceDiscoveryRecord[] {
  validateCutoff(world, cutoff);
  return world.history.evidenceDiscoveries
    .filter(
      (discovery) =>
        (query.personId === undefined ||
          discovery.personId === query.personId) &&
        (query.evidenceArtifactId === undefined ||
          discovery.evidenceArtifactId === query.evidenceArtifactId) &&
        discoveryAvailable(discovery, cutoff),
    )
    .map((discovery) => structuredClone(discovery));
}

export function evidenceDiscoveriesForPersonAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): readonly EvidenceDiscoveryRecord[] {
  return evidenceDiscoveryHistory(world, { personId }, cutoff);
}

export function evidenceDiscoveryHistoryForArtifactAt(
  world: World,
  evidenceArtifactId: EntityId,
  cutoff: HistoricalCutoff,
): readonly EvidenceDiscoveryRecord[] {
  return evidenceDiscoveryHistory(world, { evidenceArtifactId }, cutoff);
}

function validateCutoff(world: World, cutoff: HistoricalCutoff): void {
  makeIsoDate(cutoff.asOfDate);
  if (
    cutoff.asOfDate > world.currentDate ||
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0 ||
    cutoff.historySequenceExclusive > world.history.nextSequence
  ) {
    throw new Error("Evidence cutoff is invalid.");
  }
}

function artifactAvailable(
  artifact: EvidenceArtifactRecord,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    artifact.createdAt <= cutoff.asOfDate &&
    artifact.sequence < cutoff.historySequenceExclusive
  );
}

function discoveryAvailable(
  discovery: EvidenceDiscoveryRecord,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    discovery.discoveredAt <= cutoff.asOfDate &&
    discovery.sequence < cutoff.historySequenceExclusive
  );
}

function canonicalIds(ids: readonly EntityId[]): readonly EntityId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function cloneProvenance(
  provenance: EvidenceRecordProvenance,
): EvidenceRecordProvenance {
  return provenance.kind === "simulated"
    ? {
        kind: "simulated",
        sourceEntityIds: canonicalIds(provenance.sourceEntityIds),
      }
    : { kind: "authored", note: provenance.note };
}
