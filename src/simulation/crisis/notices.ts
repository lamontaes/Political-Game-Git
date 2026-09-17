import type { EntityId, EventVisibility, IsoDate, World } from "../types";
import { MORTALITY_CAUSE_KEY } from "./mortality";
import { pendingDisasterDecisions } from "./disaster";
import { crisisRecordIndex, crisisRecords } from "./records";
import type {
  CrisisRecord,
  HazardEpisodeRecord,
  HazardMagnitude,
  OfficeRef,
  OfficialContinuityChange,
} from "./types";

/**
 * Read-only CRISIS projections for the lanes that act on CRISIS facts.
 * Nothing here writes. Consumers deduplicate on
 * `noticeKey + consumer + consumerVersion` so a UI read and a due runner can
 * never apply the same fact twice.
 */

export const CRISIS_ENVELOPE_SCHEMA = "crisis-envelope-v1" as const;

export interface OfficeContinuityNotice {
  readonly noticeKey: string;
  readonly sequence: number;
  readonly originEventId: EntityId;
  readonly personId: EntityId;
  readonly kind: OfficialContinuityChange;
  readonly effectiveDate: IsoDate;
  readonly recordedDate: IsoDate;
  readonly visibility: EventVisibility;
  readonly offices: readonly OfficeRef[];
  readonly sourceRecordId: EntityId;
}

/** For GOVERNING: officeholder death and capacity changes, oldest first. */
export function crisisOfficeContinuityNotices(
  world: World,
  options: { readonly afterSequence?: number } = {},
): readonly OfficeContinuityNotice[] {
  const after = options.afterSequence ?? -1;
  return crisisRecords(world).flatMap((record) =>
    record.kind === "official-continuity" && record.sequence > after
      ? [
          {
            noticeKey: record.stableKey,
            sequence: record.sequence,
            originEventId: record.eventId!,
            personId: record.personId,
            kind: record.change,
            effectiveDate: record.effectiveAt,
            recordedDate: record.recordedAt,
            visibility: record.visibility,
            offices: record.offices,
            sourceRecordId: record.sourceRecordId,
          },
        ]
      : [],
  );
}

export interface PersonDeathNotice {
  readonly noticeKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly deathRecordId: EntityId;
  readonly deathEventId: EntityId;
  readonly diedAt: IsoDate;
  readonly causeKey: string;
  readonly causeResolved: boolean;
  /** True when the dead person was the player's controlled person. */
  readonly controlledPerson: boolean;
  readonly heldOffice: boolean;
}

/**
 * For PEOPLE: every death, including ordinary civilians, for family and
 * controlled-person continuation. Office succession is not implied here.
 */
export function crisisPersonDeathNotices(
  world: World,
  options: { readonly afterSequence?: number } = {},
): readonly PersonDeathNotice[] {
  const after = options.afterSequence ?? -1;
  const officeDeaths = new Set(
    crisisRecords(world).flatMap((record) =>
      record.kind === "official-continuity" && record.change === "death"
        ? [record.sourceRecordId]
        : [],
    ),
  );
  return world.history.personDeaths
    .filter((death) => death.sequence > after)
    .map((death) => ({
      noticeKey: `crisis:person-death:${death.id}`,
      sequence: death.sequence,
      personId: death.personId,
      deathRecordId: death.id,
      deathEventId: death.eventId,
      diedAt: death.diedAt,
      causeKey: death.causeKey,
      causeResolved: death.causeKey !== MORTALITY_CAUSE_KEY,
      controlledPerson:
        world.control.kind === "person" &&
        world.control.personId === death.personId,
      heldOffice: officeDeaths.has(death.id),
    }));
}

export type CrisisEnvelopeKind =
  | "health-episode"
  | "health-disclosure"
  | "official-continuity"
  | "disaster-damage"
  | "aid-decision"
  | "repair-progress"
  | "public-health-disruption"
  | "international-conflict-spillover";

/** CRUNCH46 §13 event envelope over stored CRISIS truth. */
export interface CrisisEnvelope {
  readonly schemaVersion: typeof CRISIS_ENVELOPE_SCHEMA;
  readonly originEventId: EntityId;
  readonly recordId: EntityId;
  readonly kind: CrisisEnvelopeKind;
  readonly effectiveMoment: IsoDate;
  readonly recordedAt: IsoDate;
  readonly geographyIds: readonly EntityId[];
  readonly actorIds: readonly EntityId[];
  readonly subjectIds: readonly EntityId[];
  readonly payload: Readonly<Record<string, unknown>>;
  readonly visibility: EventVisibility;
  readonly knowledgeSourceIds: readonly EntityId[];
  readonly causalParents: readonly EntityId[];
  readonly recordSchemaVersion: string;
}

export function crisisEnvelopeDedupeKey(
  envelope: CrisisEnvelope,
  consumer: string,
  consumerVersion: string,
): string {
  return `${envelope.recordId}|${consumer}|${consumerVersion}|${envelope.recordSchemaVersion}`;
}

function homeOf(world: World, personId: EntityId): EntityId[] {
  const person = world.people[personId];
  return person ? [person.homeJurisdictionId] : [];
}

function envelopeFor(
  world: World,
  record: CrisisRecord,
): CrisisEnvelope | null {
  const base = {
    schemaVersion: CRISIS_ENVELOPE_SCHEMA,
    recordId: record.id,
    effectiveMoment: record.effectiveAt,
    recordedAt: record.recordedAt,
    visibility: record.visibility,
    causalParents: record.causalParentIds,
    recordSchemaVersion: record.schemaVersion,
  };
  switch (record.kind) {
    case "health-episode":
      return {
        ...base,
        originEventId: record.eventId!,
        kind: "health-episode",
        geographyIds: homeOf(world, record.personId),
        actorIds: [],
        subjectIds: [record.personId],
        payload: {
          severity: record.severity,
          label: record.label,
          conditionKey: record.conditionKey,
        },
        knowledgeSourceIds: [record.personId],
      };
    case "health-disclosure":
      return record.eventId === null
        ? null
        : {
            ...base,
            originEventId: record.eventId,
            kind: "health-disclosure",
            geographyIds: homeOf(world, record.personId),
            actorIds: record.decidedByPersonId
              ? [record.decidedByPersonId]
              : [],
            subjectIds: [record.personId],
            payload: { access: record.access },
            knowledgeSourceIds: record.recipientIds,
          };
    case "official-continuity":
      return {
        ...base,
        originEventId: record.eventId!,
        kind: "official-continuity",
        geographyIds: homeOf(world, record.personId),
        actorIds: [],
        subjectIds: [record.personId],
        payload: {
          change: record.change,
          officeKeys: record.offices.map((office) => office.officeKey),
        },
        knowledgeSourceIds: [],
      };
    case "disaster-assessment": {
      const episode = hazardOf(world, record.episodeId);
      return {
        ...base,
        originEventId: episode.eventId!,
        kind: "disaster-damage",
        geographyIds: episode.jurisdictionIds,
        actorIds: [],
        subjectIds: [episode.id],
        payload: {
          hazard: episode.family,
          severity: episode.magnitude,
          severityOrdinal: SEVERITY_ORDINAL[episode.magnitude],
          intensity: SEVERITY_ORDINAL[episode.magnitude] / 3,
          exposedHouseholds: record.exposed.household,
          exposedDwellings: record.exposed.dwelling,
          exposedOrganizations: record.exposed.organization,
          householdsDamaged: record.damaged.household,
          householdsDestroyed: record.destroyed.household,
          dwellingsDamaged: record.damaged.dwelling,
          dwellingsDestroyed: record.destroyed.dwelling,
          organizationsInterrupted: record.damaged.organization,
          injuredPeople: record.injuredPersonIds.length,
          deceasedPeople: record.deceasedPersonIds.length,
          repairUnits: record.totalRepairUnits,
          units: {
            households: "represented household records",
            dwellings: "represented dwelling records",
            organizations: "represented organization records",
            repairUnits: "authored repair-effort units",
          },
        },
        knowledgeSourceIds: [],
      };
    }
    case "disaster-response": {
      if (
        record.stage !== "federal-declared" &&
        record.stage !== "federal-denied" &&
        record.stage !== "follow-up"
      )
        return null;
      const episode = hazardOf(world, record.episodeId);
      return {
        ...base,
        originEventId: record.eventId!,
        kind: record.stage === "follow-up" ? "repair-progress" : "aid-decision",
        geographyIds: episode.jurisdictionIds,
        actorIds: record.actorPersonId ? [record.actorPersonId] : [],
        subjectIds: [episode.id],
        payload:
          record.stage === "follow-up"
            ? { status: "ended", remainingRepairUnits: 0 }
            : {
                decision:
                  record.stage === "federal-declared" ? "declared" : "denied",
                programs: record.programs,
                amount: null,
              },
        knowledgeSourceIds: [],
      };
    }
    case "repair-progress": {
      const episode = hazardOf(world, record.episodeId);
      return {
        ...base,
        originEventId: episode.eventId!,
        kind: "repair-progress",
        geographyIds: episode.jurisdictionIds,
        actorIds: [],
        subjectIds: [record.damageId],
        payload: {
          status: record.remainingUnits === 0 ? "repaired" : "in-progress",
          unitsApplied: record.unitsApplied,
          remainingUnits: record.remainingUnits,
          funding: record.funding,
        },
        knowledgeSourceIds: [],
      };
    }
    default:
      return null;
  }
}

const SEVERITY_ORDINAL: Record<HazardMagnitude, number> = {
  minor: 0,
  moderate: 1,
  major: 2,
  catastrophic: 3,
};

function hazardOf(world: World, episodeId: EntityId): HazardEpisodeRecord {
  const record = crisisRecordIndex(world).get(episodeId);
  if (!record || record.kind !== "hazard-episode")
    throw new Error(`Unknown hazard episode: ${episodeId}`);
  return record;
}

/**
 * Envelopes whose effective date lies in [from, to), oldest first. CHANGE
 * reads its closed month here; PRESS reads the public ones.
 */
export function crisisEnvelopesBetween(
  world: World,
  from: IsoDate,
  to: IsoDate,
  options: { readonly visibility?: readonly EventVisibility[] } = {},
): readonly CrisisEnvelope[] {
  const allowed = options.visibility;
  return crisisRecords(world)
    .filter((record) => record.effectiveAt >= from && record.effectiveAt < to)
    .flatMap((record) => {
      const envelope = envelopeFor(world, record);
      return envelope && (!allowed || allowed.includes(envelope.visibility))
        ? [envelope]
        : [];
    });
}

export interface CrisisProtectedDecision {
  readonly key: string;
  readonly personId: EntityId;
  readonly kind:
    | "own-health-disclosure"
    | "controlled-person-died"
    | "disaster-state-request"
    | "disaster-federal-declaration";
  readonly sinceSequence: number;
}

/**
 * Facts after `afterSequence` that give the controlled person something only
 * they can decide. A time skip stops for these and for nothing else here.
 */
export function crisisProtectedDecisions(
  world: World,
  afterSequence: number,
): readonly CrisisProtectedDecision[] {
  if (world.control.kind !== "person") return [];
  const personId = world.control.personId;
  const decisions: CrisisProtectedDecision[] = [];
  for (const record of crisisRecords(world)) {
    if (
      record.sequence > afterSequence &&
      record.kind === "health-episode" &&
      record.personId === personId
    )
      decisions.push({
        key: `crisis:decision:disclose:${record.id}`,
        personId,
        kind: "own-health-disclosure",
        sinceSequence: record.sequence,
      });
  }
  for (const pending of pendingDisasterDecisions(world))
    if (pending.sequence > afterSequence)
      decisions.push({
        key: `crisis:decision:${pending.decision}:${pending.episodeId}`,
        personId,
        kind:
          pending.decision === "state-request"
            ? "disaster-state-request"
            : "disaster-federal-declaration",
        sinceSequence: pending.sequence,
      });
  for (const death of world.history.personDeaths)
    if (death.sequence > afterSequence && death.personId === personId)
      decisions.push({
        key: `crisis:decision:continue:${death.id}`,
        personId,
        kind: "controlled-person-died",
        sinceSequence: death.sequence,
      });
  return decisions;
}
