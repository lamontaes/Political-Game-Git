import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import type { EntityId, IsoDate, World } from "../types";
import { MORTALITY_CALIBRATION_CATEGORIES } from "./mortality-table";
import {
  CRISIS_MORTALITY_MODEL,
  CRISIS_RECORD_SCHEMA,
  type CrisisRecord,
  type CrisisRecordInput,
  type DisasterDamageRecord,
  type HazardEpisodeRecord as HazardRecord,
  type HealthAccess,
  type HealthDisclosureRecord,
  type HealthEpisodeRecord,
  type HealthStateRecord,
} from "./types";

/**
 * Append and integrity for the CRISIS record family. This module does not
 * import the World writer so `world.ts` can call its integrity check.
 */

export const CRISIS_TRANSITION_PREFIX = "crisis:" as const;

const EMPTY: readonly CrisisRecord[] = [];

export function crisisRecords(world: World): readonly CrisisRecord[] {
  return world.history.crisisRecords ?? EMPTY;
}

export function crisisRecordId(world: World, stableKey: string): EntityId {
  return createStableId("crisis-record", `${world.id}:${stableKey}`);
}

const INDEX = new WeakMap<
  readonly CrisisRecord[],
  Map<EntityId, CrisisRecord>
>();

/** Records by id, cached per immutable record array. */
export function crisisRecordIndex(
  world: World,
): ReadonlyMap<EntityId, CrisisRecord> {
  const records = crisisRecords(world);
  let index = INDEX.get(records);
  if (!index) {
    index = new Map(records.map((record) => [record.id, record]));
    INDEX.set(records, index);
  }
  return index;
}

export function crisisEntityExists(world: World, id: EntityId): boolean {
  return (
    (world.history.crisisRecords?.length ?? 0) > 0 &&
    crisisRecordIndex(world).has(id)
  );
}

export function crisisEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  if (!world.history.crisisRecords?.length) return false;
  const record = crisisRecordIndex(world).get(id);
  return (
    !!record &&
    record.sequence < sequenceExclusive &&
    record.effectiveAt <= asOfDate
  );
}

export function findCrisisRecord(
  world: World,
  stableKey: string,
): CrisisRecord | undefined {
  return crisisRecords(world).find((record) => record.stableKey === stableKey);
}

/**
 * Appends one record at the next history sequence. Callers validate the
 * whole World afterwards through their ordinary writer.
 */
export function appendCrisisRecord(
  world: World,
  input: CrisisRecordInput,
): World {
  if (input.stableKey.trim() !== input.stableKey || !input.stableKey)
    throw new Error("A CRISIS record needs a trimmed stable key.");
  if (crisisRecordIndex(world).has(crisisRecordId(world, input.stableKey)))
    throw new Error(`Duplicate CRISIS record: ${input.stableKey}`);
  const effectiveAt = makeIsoDate(input.effectiveAt);
  if (effectiveAt > world.currentDate)
    throw new Error("A CRISIS record cannot take effect in the future.");
  const record = {
    ...input,
    id: crisisRecordId(world, input.stableKey),
    sequence: world.history.nextSequence,
    schemaVersion: CRISIS_RECORD_SCHEMA,
    recordedAt: world.currentDate,
    effectiveAt,
    causalParentIds: [...input.causalParentIds],
  } as CrisisRecord;
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      crisisRecords: [...crisisRecords(world), record],
    },
  };
}

const ACCESS_ORDER: readonly HealthAccess[] = [
  "private",
  "specific-people",
  "official",
  "public",
];

export function healthAccessRank(access: HealthAccess): number {
  return ACCESS_ORDER.indexOf(access);
}

function referenceSequences(world: World): ReadonlyMap<EntityId, number> {
  const sequences = new Map<EntityId, number>();
  for (const family of [
    crisisRecords(world),
    world.history.events,
    world.history.futureDueItems,
    world.history.personDeaths,
    world.history.personFunctionalCapacities,
    world.history.incidents,
  ] as readonly (readonly { id: EntityId; sequence: number }[])[])
    for (const record of family) sequences.set(record.id, record.sequence);
  return sequences;
}

function fail(record: CrisisRecord, message: string): never {
  throw new Error(`CRISIS record ${record.stableKey}: ${message}`);
}

/** Load-time integrity. Corrupt records are rejected, never repaired. */
export function assertCrisisIntegrity(world: World): void {
  const records = crisisRecords(world);
  if (records.length === 0) return;
  const validated = VALIDATED.get(records);
  if (
    validated &&
    validated.worldId === world.id &&
    validated.currentDate <= world.currentDate &&
    validated.nextSequence <= world.history.nextSequence
  )
    return;
  validateCrisisRecords(world, records);
  VALIDATED.set(records, {
    worldId: world.id,
    currentDate: world.currentDate,
    nextSequence: world.history.nextSequence,
  });
}

/**
 * Records are immutable and append-only: a record array that validated
 * against a World stays valid as that World only moves forward.
 */
const VALIDATED = new WeakMap<
  readonly CrisisRecord[],
  { worldId: EntityId; currentDate: IsoDate; nextSequence: number }
>();

function validateCrisisRecords(
  world: World,
  records: readonly CrisisRecord[],
): void {
  let sequencesCache: ReadonlyMap<EntityId, number> | null = null;
  const sequenceOf = (id: EntityId) =>
    (sequencesCache ??= referenceSequences(world)).get(id);
  const eventsById = new Map(world.history.events.map((e) => [e.id, e]));
  const keys = new Set<string>();
  const episodes = new Map<EntityId, HealthEpisodeRecord>();
  const latestState = new Map<EntityId, HealthStateRecord>();
  const latestDisclosure = new Map<EntityId, HealthDisclosureRecord>();
  const hazards = new Map<EntityId, HazardRecord>();
  const damages = new Map<EntityId, DisasterDamageRecord>();
  const crises = new Set<EntityId>();
  let previousSequence = -1;
  for (const record of records) {
    if (record.schemaVersion !== CRISIS_RECORD_SCHEMA)
      fail(record, "unknown schema version");
    if (keys.has(record.stableKey)) fail(record, "duplicate stable key");
    keys.add(record.stableKey);
    if (record.id !== crisisRecordId(world, record.stableKey))
      fail(record, "identity does not match its stable key");
    if (record.sequence <= previousSequence)
      fail(record, "records are not in sequence order");
    previousSequence = record.sequence;
    const effectiveAt: IsoDate = makeIsoDate(record.effectiveAt);
    const recordedAt: IsoDate = makeIsoDate(record.recordedAt);
    if (effectiveAt > recordedAt || recordedAt > world.currentDate)
      fail(record, "impossible chronology");
    for (const parent of record.causalParentIds) {
      const sequence = sequenceOf(parent);
      if (sequence === undefined || sequence >= record.sequence)
        fail(record, `causal parent is missing or later: ${parent}`);
    }
    if (record.eventId !== null) {
      const event = eventsById.get(record.eventId);
      if (!event || event.sequence >= record.sequence)
        fail(record, "linked event is missing or later");
      if (event.visibility !== record.visibility)
        fail(record, "linked event visibility differs");
    }
    const personId = "personId" in record ? record.personId : null;
    if (personId !== null && !world.people[personId])
      fail(record, `missing person ${personId}`);

    switch (record.kind) {
      case "mortality-window": {
        const due = world.history.futureDueItems.find(
          (item) => item.id === record.dueItemId,
        );
        if (
          record.model !== CRISIS_MORTALITY_MODEL ||
          !due ||
          due.transitionKey !== "crisis:mortality-window" ||
          due.dueAt !== record.effectiveAt ||
          record.windowEnd <= record.effectiveAt ||
          record.newlyTrackedPersonIds.some((id) => !world.people[id])
        )
          fail(record, "malformed mortality window");
        break;
      }
      case "mortality-calibration":
        if (!MORTALITY_CALIBRATION_CATEGORIES.includes(record.category))
          fail(record, "unknown calibration category");
        if (!record.basis.trim()) fail(record, "calibration needs a basis");
        break;
      case "health-episode":
        if (
          !Number.isSafeInteger(record.hazardMultiplierMicros) ||
          record.hazardMultiplierMicros < 0 ||
          !record.hazardBasis.trim()
        )
          fail(record, "malformed hazard multiplier");
        if ((record.label === "condition") !== (record.conditionKey !== null))
          fail(record, "only a condition pack may name a condition");
        if (
          record.label === "condition" &&
          record.origin.kind !== "condition-pack"
        )
          fail(record, "a named condition needs a condition pack origin");
        episodes.set(record.id, record);
        break;
      case "health-state": {
        const episode = episodes.get(record.episodeId);
        if (!episode || episode.personId !== record.personId)
          fail(record, "state for an unknown episode");
        const prior = latestState.get(record.episodeId);
        if (prior?.state === "deceased" || prior?.state === "recovered")
          fail(record, "episode already ended");
        if (prior && record.effectiveAt < prior.effectiveAt)
          fail(record, "state moved backward in time");
        if (record.capacityRecordId !== null) {
          const capacity = world.history.personFunctionalCapacities.find(
            (c) => c.id === record.capacityRecordId,
          );
          if (!capacity || capacity.personId !== record.personId)
            fail(record, "capacity link does not match");
        }
        latestState.set(record.episodeId, record);
        break;
      }
      case "health-disclosure": {
        const episode = episodes.get(record.episodeId);
        if (!episode || episode.personId !== record.personId)
          fail(record, "disclosure for an unknown episode");
        const prior = latestDisclosure.get(record.episodeId);
        if (
          prior &&
          healthAccessRank(record.access) < healthAccessRank(prior.access)
        )
          fail(record, "disclosed information cannot become less known");
        if (record.recipientIds.some((id) => !world.people[id]))
          fail(record, "unknown disclosure recipient");
        if (
          record.decidedByPersonId !== null &&
          !world.people[record.decidedByPersonId]
        )
          fail(record, "unknown disclosure decider");
        latestDisclosure.set(record.episodeId, record);
        break;
      }
      case "hazard-episode":
        if (
          record.jurisdictionIds.length === 0 ||
          record.jurisdictionIds.some((id) => !world.jurisdictions[id]) ||
          !/^[A-Z]{2}$/.test(record.stateUsps) ||
          record.endsAt <= record.effectiveAt ||
          !record.basis.trim()
        )
          fail(record, "malformed hazard episode");
        hazards.set(record.id, record);
        break;
      case "disaster-damage": {
        const episode = hazards.get(record.episodeId);
        if (
          !episode ||
          !episode.jurisdictionIds.includes(record.jurisdictionId) ||
          !Number.isSafeInteger(record.repairUnits) ||
          record.repairUnits <= 0 ||
          (record.level === "service-interrupted") !==
            (record.targetKind === "organization")
        )
          fail(record, "malformed disaster damage");
        damages.set(record.id, record);
        break;
      }
      case "disaster-assessment":
      case "disaster-response":
        if (!hazards.has(record.episodeId))
          fail(record, "response for an unknown hazard episode");
        break;
      case "repair-progress": {
        const damage = damages.get(record.damageId);
        if (
          !damage ||
          damage.episodeId !== record.episodeId ||
          record.unitsApplied <= 0 ||
          record.remainingUnits < 0 ||
          record.remainingUnits >= damage.repairUnits
        )
          fail(record, "malformed repair progress");
        break;
      }
      case "international-crisis":
        if (
          !record.counterpartyLabel.trim() ||
          !record.subject.trim() ||
          !record.basis.trim()
        )
          fail(record, "malformed international crisis");
        crises.add(record.id);
        break;
      case "intelligence-assessment":
      case "crisis-options":
      case "crisis-decision":
      case "counterparty-response":
      case "war-powers":
        if (!crises.has(record.crisisId))
          fail(record, "record for an unknown international crisis");
        if (
          record.kind === "war-powers" &&
          record.terminationAt !== null &&
          record.terminationAt < record.effectiveAt
        )
          fail(record, "war powers termination precedes its record");
        break;
      case "violence-attempt":
        if (!world.people[record.targetPersonId])
          fail(record, "missing attempt target");
        if (
          record.threatEvidenceIds.length === 0 ||
          record.threatEvidenceIds.some(
            (id) => !record.causalParentIds.includes(id),
          )
        )
          fail(record, "attempt lacks its threat evidence");
        break;
      case "official-continuity": {
        const source =
          world.history.personDeaths.find(
            (d) => d.id === record.sourceRecordId,
          ) ??
          world.history.personFunctionalCapacities.find(
            (c) => c.id === record.sourceRecordId,
          );
        if (!source || source.personId !== record.personId)
          fail(record, "continuity source does not match");
        if ((record.change === "death") !== "diedAt" in source)
          fail(record, "continuity change does not match its source");
        if (record.offices.length === 0)
          fail(record, "continuity notice without an office");
        break;
      }
    }
  }
}
