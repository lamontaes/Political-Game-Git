import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import type {
  EntityId,
  EntityKind,
  EvidenceArtifactRecord,
  EvidenceDiscoveryRecord,
  EvidenceRecordProvenance,
  HistoricalCutoff,
  HistoricalEvent,
  World,
} from "./types";
import { isPersonAliveAt } from "./vitality-integrity";

const EVIDENCE_ACCESSES = [
  "public",
  "restricted",
  "private",
  "sealed",
] as const;
const SEMANTIC_KEY = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/;

export const EVIDENCE_DISCOVERY_EVENT_TYPE = "evidence.discovered" as const;
export const EVIDENCE_DISCOVERY_PARTICIPANT_ROLE =
  "observation:evidence-discovery" as const;
export const EVIDENCE_DISCOVERY_EVENT_TAG = "evidence.discovery" as const;

export type EvidenceHistoryRecord =
  EvidenceArtifactRecord | EvidenceDiscoveryRecord;

export function evidenceHistoryRecords(
  world: World,
): readonly EvidenceHistoryRecord[] {
  return [
    ...world.history.evidenceArtifacts,
    ...world.history.evidenceDiscoveries,
  ];
}

export function evidenceEntityExists(world: World, id: EntityId): boolean {
  return evidenceHistoryRecords(world).some((record) => record.id === id);
}

export function evidenceEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  const artifact = world.history.evidenceArtifacts.find(
    (record) => record.id === id,
  );
  if (artifact) {
    return (
      artifact.createdAt <= asOfDate && artifact.sequence < sequenceExclusive
    );
  }
  const discovery = world.history.evidenceDiscoveries.find(
    (record) => record.id === id,
  );
  return !!(
    discovery &&
    discovery.discoveredAt <= asOfDate &&
    discovery.sequence < sequenceExclusive
  );
}

export { evidenceEntityAvailableAt as entityAvailableAt };
export { evidenceEntityExists as entityExists };

export function evidenceDiscoveryEventStableKey(
  discoveryStableKey: string,
): string {
  return `${discoveryStableKey}:event`;
}

export function evidenceDiscoveryKnowledgeStableKey(
  discoveryStableKey: string,
): string {
  return `${discoveryStableKey}:knowledge`;
}

export function evidenceDiscoverySummary(
  artifact: EvidenceArtifactRecord,
): string {
  return artifact.description === null
    ? `Discovered evidence (${artifact.evidenceKind}).`
    : `Discovered evidence: ${artifact.description}`;
}

export function assertEvidenceIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  assertSequenceOrdered(world.history.evidenceArtifacts, "evidence artifact");
  assertSequenceOrdered(
    world.history.evidenceDiscoveries,
    "evidence discovery",
  );

  const artifactKeys = new Set<string>();
  const artifacts = new Map<EntityId, EvidenceArtifactRecord>();
  for (const artifact of world.history.evidenceArtifacts) {
    assertHistoryIdentity(
      ids,
      world,
      artifact,
      "evidence-artifact",
      artifact.stableKey,
    );
    assertUniqueKey(artifactKeys, artifact.stableKey, "evidence artifact");
    validateArtifact(world, artifact);
    artifacts.set(artifact.id, artifact);
  }

  const discoveryKeys = new Set<string>();
  const personArtifactPairs = new Set<string>();
  for (const discovery of world.history.evidenceDiscoveries) {
    assertHistoryIdentity(
      ids,
      world,
      discovery,
      "evidence-discovery",
      discovery.stableKey,
    );
    assertUniqueKey(discoveryKeys, discovery.stableKey, "evidence discovery");
    const pair = `${discovery.personId}:${discovery.evidenceArtifactId}`;
    assertUniqueKey(
      personArtifactPairs,
      pair,
      "person/evidence-artifact discovery",
    );
    validateDiscovery(world, discovery, artifacts);
  }
  for (const event of world.history.events.filter(
    (candidate) => candidate.type === EVIDENCE_DISCOVERY_EVENT_TYPE,
  )) {
    if (
      world.history.evidenceDiscoveries.filter(
        (discovery) => discovery.discoveryEventId === event.id,
      ).length !== 1
    ) {
      throw new Error(
        `Reserved evidence-discovery event lacks exactly one discovery record: ${event.id}`,
      );
    }
  }
}

function validateArtifact(
  world: World,
  artifact: EvidenceArtifactRecord,
): void {
  assertNonEmpty(artifact.stableKey, "Evidence artifact stable key");
  assertSemanticKey(artifact.evidenceKind, "Evidence artifact kind");
  makeIsoDate(artifact.createdAt);
  makeIsoDate(artifact.recordedAt);
  if (
    artifact.createdAt > artifact.recordedAt ||
    artifact.recordedAt > world.currentDate
  ) {
    throw new Error(
      `Evidence artifact has impossible chronology: ${artifact.id}`,
    );
  }
  if (!EVIDENCE_ACCESSES.includes(artifact.access)) {
    throw new Error(`Evidence artifact has invalid access: ${artifact.id}`);
  }
  assertOptionalNonEmpty(artifact.description, "Evidence artifact description");
  assertCanonicalIds(
    artifact.relatedEntityIds,
    "Evidence artifact related entities",
  );
  if (artifact.relatedEntityIds.length === 0) {
    throw new Error(
      `Evidence artifact requires a related event or incident: ${artifact.id}`,
    );
  }
  for (const relatedEntityId of artifact.relatedEntityIds) {
    if (
      !sourceTruthAvailableAt(
        world,
        relatedEntityId,
        artifact.createdAt,
        artifact.sequence,
      )
    ) {
      throw new Error(
        `Evidence artifact related entity is unavailable at creation: ${relatedEntityId}`,
      );
    }
  }
  validateArtifactProvenance(world, artifact);
}

function validateArtifactProvenance(
  world: World,
  artifact: EvidenceArtifactRecord,
): void {
  validateProvenanceShape(artifact.provenance, "Evidence artifact provenance");
  if (artifact.provenance.kind !== "simulated") return;
  const relatedIds = new Set(artifact.relatedEntityIds);
  for (const sourceId of artifact.provenance.sourceEntityIds) {
    if (
      !relatedIds.has(sourceId) ||
      !sourceTruthAvailableAt(
        world,
        sourceId,
        artifact.createdAt,
        artifact.sequence,
      )
    ) {
      throw new Error(
        `Evidence artifact provenance source is unavailable or unrelated: ${sourceId}`,
      );
    }
  }
}

function validateDiscovery(
  world: World,
  discovery: EvidenceDiscoveryRecord,
  artifacts: ReadonlyMap<EntityId, EvidenceArtifactRecord>,
): void {
  assertNonEmpty(discovery.stableKey, "Evidence discovery stable key");
  assertSemanticKey(discovery.methodKey, "Evidence discovery method");
  makeIsoDate(discovery.discoveredAt);
  makeIsoDate(discovery.recordedAt);
  if (
    discovery.discoveredAt > discovery.recordedAt ||
    discovery.recordedAt > world.currentDate
  ) {
    throw new Error(
      `Evidence discovery has impossible chronology: ${discovery.id}`,
    );
  }

  const person = world.people[discovery.personId];
  if (!person) {
    throw new Error(
      `Evidence discovery references a missing person: ${discovery.personId}`,
    );
  }
  const artifact = artifacts.get(discovery.evidenceArtifactId);
  if (
    !artifact ||
    artifact.sequence >= discovery.sequence ||
    !evidenceEntityAvailableAt(
      world,
      artifact.id,
      discovery.discoveredAt,
      discovery.sequence,
    )
  ) {
    throw new Error(
      `Evidence discovery references an unavailable artifact: ${discovery.evidenceArtifactId}`,
    );
  }
  const discoveryCutoff: HistoricalCutoff = {
    asOfDate: discovery.discoveredAt,
    historySequenceExclusive: discovery.sequence,
  };
  if (!isPersonAliveAt(world, person.id, discoveryCutoff)) {
    throw new Error(
      `Evidence discovery person is not alive at discovery: ${person.id}`,
    );
  }

  validateDiscoveryEvent(world, discovery, artifact);
  validateDiscoveryKnowledge(world, discovery, artifact);
  validateDiscoveryProvenance(world, discovery, artifact);
}

function validateDiscoveryEvent(
  world: World,
  discovery: EvidenceDiscoveryRecord,
  artifact: EvidenceArtifactRecord,
): void {
  const stableKey = evidenceDiscoveryEventStableKey(discovery.stableKey);
  const expectedId = createStableId("event", `${world.id}:${stableKey}`);
  const event = world.history.events.find(
    (candidate) => candidate.id === discovery.discoveryEventId,
  );
  const expectedInvolvedIds = canonicalIds([
    discovery.personId,
    discovery.evidenceArtifactId,
  ]);
  if (
    !event ||
    discovery.discoveryEventId !== expectedId ||
    event.id !== expectedId ||
    event.stableKey !== stableKey ||
    event.sequence + 1 !== discovery.sequence ||
    event.type !== EVIDENCE_DISCOVERY_EVENT_TYPE ||
    event.occurredAt !== discovery.discoveredAt ||
    event.recordedAt !== discovery.recordedAt ||
    event.jurisdictionId !== null ||
    !sameIds(event.involvedEntityIds, expectedInvolvedIds) ||
    event.participants.length !== 1 ||
    event.participants[0]?.personId !== discovery.personId ||
    event.participants[0]?.role !== EVIDENCE_DISCOVERY_PARTICIPANT_ROLE ||
    event.participants[0]?.detail !== null ||
    event.personFactConstraints.length !== 0 ||
    event.visibility !== "private" ||
    event.tags.length !== 1 ||
    event.tags[0] !== EVIDENCE_DISCOVERY_EVENT_TAG ||
    event.summary !== evidenceDiscoverySummary(artifact) ||
    !isEmptyEventContext(event)
  ) {
    throw new Error(
      `Evidence discovery event is missing or mismatched: ${discovery.id}`,
    );
  }
}

function validateDiscoveryKnowledge(
  world: World,
  discovery: EvidenceDiscoveryRecord,
  artifact: EvidenceArtifactRecord,
): void {
  const stableKey = evidenceDiscoveryKnowledgeStableKey(discovery.stableKey);
  const expectedId = createStableId("knowledge", `${world.id}:${stableKey}`);
  const knowledge = world.history.knowledge.find(
    (candidate) => candidate.id === expectedId,
  );
  if (
    !knowledge ||
    knowledge.stableKey !== stableKey ||
    knowledge.sequence !== discovery.sequence + 1 ||
    knowledge.personId !== discovery.personId ||
    knowledge.eventId !== discovery.discoveryEventId ||
    knowledge.learnedAt !== discovery.discoveredAt ||
    knowledge.believedSummary !== evidenceDiscoverySummary(artifact) ||
    knowledge.accuracy !== "accurate" ||
    knowledge.confidence !== "high" ||
    knowledge.source.kind !== "direct"
  ) {
    throw new Error(
      `Evidence discovery knowledge is missing or mismatched: ${discovery.id}`,
    );
  }
}

function validateDiscoveryProvenance(
  world: World,
  discovery: EvidenceDiscoveryRecord,
  artifact: EvidenceArtifactRecord,
): void {
  validateProvenanceShape(
    discovery.provenance,
    "Evidence discovery provenance",
  );
  if (discovery.provenance.kind !== "simulated") return;
  if (!discovery.provenance.sourceEntityIds.includes(artifact.id)) {
    throw new Error(
      `Evidence discovery provenance must include its artifact: ${discovery.id}`,
    );
  }
  for (const sourceId of discovery.provenance.sourceEntityIds) {
    if (
      !discoverySourceAvailableAt(
        world,
        sourceId,
        discovery.discoveredAt,
        discovery.sequence,
      )
    ) {
      throw new Error(
        `Evidence discovery provenance source is unavailable: ${sourceId}`,
      );
    }
  }
}

function sourceTruthAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  const event = world.history.events.find((record) => record.id === id);
  if (event) {
    return event.occurredAt <= asOfDate && event.sequence < sequenceExclusive;
  }
  const incident = world.history.incidents.find((record) => record.id === id);
  return !!(
    incident &&
    incident.onsetAt <= asOfDate &&
    incident.sequence < sequenceExclusive
  );
}

function discoverySourceAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  return (
    evidenceEntityAvailableAt(world, id, asOfDate, sequenceExclusive) ||
    sourceTruthAvailableAt(world, id, asOfDate, sequenceExclusive)
  );
}

function validateProvenanceShape(
  provenance: EvidenceRecordProvenance,
  label: string,
): void {
  switch (provenance.kind) {
    case "simulated":
      assertCanonicalIds(provenance.sourceEntityIds, `${label} sources`);
      if (provenance.sourceEntityIds.length === 0) {
        throw new Error(`${label} requires at least one source.`);
      }
      break;
    case "authored":
      assertNonEmpty(provenance.note, `${label} note`);
      break;
    default:
      throw new Error(`${label} has an invalid kind.`);
  }
}

function isEmptyEventContext(event: HistoricalEvent): boolean {
  return (
    event.context.location === null &&
    event.context.socialContext === null &&
    event.context.pressure === null &&
    event.context.choice === null &&
    event.context.motivation === null &&
    event.context.immediateReaction === null
  );
}

function assertHistoryIdentity(
  ids: Set<EntityId>,
  world: World,
  record: { readonly id: EntityId; readonly stableKey: string },
  prefix: EntityKind,
  stableKey: string,
): void {
  if (
    record.id !== createStableId(prefix, `${world.id}:${stableKey}`) ||
    ids.has(record.id)
  ) {
    throw new Error(`Invalid or duplicate ${prefix} identity: ${record.id}`);
  }
  ids.add(record.id);
}

function assertSequenceOrdered(
  records: readonly { readonly sequence: number }[],
  label: string,
): void {
  if (
    records.some(
      (record, index) =>
        index > 0 && record.sequence <= (records[index - 1]?.sequence ?? -1),
    )
  ) {
    throw new Error(`${label} history is not sequence ordered.`);
  }
}

function assertUniqueKey(keys: Set<string>, key: string, label: string): void {
  if (keys.has(key)) throw new Error(`Duplicate ${label}: ${key}`);
  keys.add(key);
}

function assertSemanticKey(value: string, label: string): void {
  if (!SEMANTIC_KEY.test(value)) {
    throw new Error(`${label} must be a namespaced semantic key: ${value}`);
  }
}

function assertNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertOptionalNonEmpty(value: string | null, label: string): void {
  if (value !== null) assertNonEmpty(value, label);
}

function assertCanonicalIds(ids: readonly EntityId[], label: string): void {
  if (!sameIds(ids, canonicalIds(ids))) {
    throw new Error(`${label} must be sorted and unique.`);
  }
}

function canonicalIds(ids: readonly EntityId[]): readonly EntityId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function sameIds(
  left: readonly EntityId[],
  right: readonly EntityId[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
