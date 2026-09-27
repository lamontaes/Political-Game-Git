import type { EntityId, EventVisibility, IsoDate, World } from "../types";
import {
  PROVISIONAL_DISASTER_POLICY,
  disasterRepairQueue,
  pendingDisasterDecisions,
} from "./disaster";
import { pendingInternationalDecisions } from "./international";
import { crisisRecordIndex, crisisRecords } from "./records";
import type {
  CrisisRecord,
  HazardEpisodeRecord,
  HazardMagnitude,
  TensionLevel,
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

// The person-death readers live in ./death-notices so the death writers can
// tell a family without importing this module's disaster and international
// readers.
export {
  crisisPersonDeathNotices,
  crisisPersonDeathRecipientNotices,
  type PersonDeathNotice,
  type PersonDeathRecipientNotice,
} from "./death-notices";

/**
 * What a repair still needs, for D's authorized funding path.
 *
 * CRISIS records the decision, the programs and the physical repair queue and
 * never an amount: the money figure comes from an adopted appropriation on
 * GOVERNING's side. One request per episode per aid decision, keyed so a
 * consumer applies it once.
 */
export interface RepairFundingRequest {
  readonly requestKey: string;
  readonly sequence: number;
  readonly episodeId: EntityId;
  readonly stateUsps: string;
  readonly jurisdictionIds: readonly EntityId[];
  readonly decisionRecordId: EntityId;
  /** Null when the decision was recorded without its own public event. */
  readonly decisionEventId: EntityId | null;
  readonly decisionStage: string;
  readonly decidedAt: IsoDate;
  readonly federallyAssisted: boolean;
  readonly programs: readonly string[];
  /** Physical work, not money: units the queue still has to do. */
  readonly remainingRepairUnits: number;
  readonly totalRepairUnits: number;
  readonly weeklyCapacity: {
    readonly local: number;
    readonly federallyAssisted: number;
  };
  /** Always null here. An amount belongs to an adopted appropriation. */
  readonly amount: null;
}

export function crisisRepairFundingRequests(
  world: World,
  options: { readonly afterSequence?: number } = {},
): readonly RepairFundingRequest[] {
  const after = options.afterSequence ?? -1;
  const records = crisisRecords(world);
  const episodes = new Map(
    records.flatMap((record) =>
      record.kind === "hazard-episode" ? [[record.id, record] as const] : [],
    ),
  );
  return records.flatMap((record) => {
    if (record.kind !== "disaster-response" || record.sequence <= after)
      return [];
    // An aid decision, not a local response or a follow-up note.
    if (
      record.stage !== "federal-declared" &&
      record.stage !== "federal-denied" &&
      record.stage !== "state-request"
    )
      return [];
    const episode = episodes.get(record.episodeId);
    if (!episode || episode.kind !== "hazard-episode") return [];
    const damages = records.filter(
      (candidate) =>
        candidate.kind === "disaster-damage" &&
        candidate.episodeId === record.episodeId &&
        candidate.level !== "service-interrupted",
    );
    const total = damages.reduce(
      (sum, damage) =>
        sum + (damage.kind === "disaster-damage" ? damage.repairUnits : 0),
      0,
    );
    const remaining = disasterRepairQueue(world, record.episodeId).reduce(
      (sum, entry) => sum + entry.remainingUnits,
      0,
    );
    return [
      {
        requestKey: `crisis:repair-funding:${record.episodeId}:${record.id}`,
        sequence: record.sequence,
        episodeId: record.episodeId,
        stateUsps: episode.stateUsps,
        jurisdictionIds: episode.jurisdictionIds,
        decisionRecordId: record.id,
        decisionEventId: record.eventId,
        decisionStage: record.stage,
        decidedAt: record.effectiveAt,
        federallyAssisted: record.stage === "federal-declared",
        programs: record.programs,
        remainingRepairUnits: remaining,
        totalRepairUnits: total,
        weeklyCapacity: {
          local: PROVISIONAL_DISASTER_POLICY.weeklyCapacity.local,
          federallyAssisted:
            PROVISIONAL_DISASTER_POLICY.weeklyCapacity.federalAssisted,
        },
        amount: null,
      },
    ];
  });
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
    case "counterparty-response":
    case "crisis-decision": {
      const crisis = crisisRecordIndex(world).get(record.crisisId);
      if (!crisis || crisis.kind !== "international-crisis") return null;
      const escalated =
        record.kind === "counterparty-response"
          ? record.counterparty === "escalated"
          : record.option === "force-posture";
      if (!escalated) return null;
      const tension =
        record.kind === "counterparty-response"
          ? record.tensionAfter
          : crisis.tension;
      return {
        ...base,
        originEventId: record.eventId!,
        kind: "international-conflict-spillover",
        geographyIds: [],
        actorIds:
          record.kind === "crisis-decision" && record.deciderPersonId
            ? [record.deciderPersonId]
            : [],
        subjectIds: [crisis.id],
        payload: {
          trigger:
            record.kind === "crisis-decision"
              ? "force-posture"
              : "counterparty-escalation",
          tension,
          severityOrdinal: TENSION_ORDINAL[tension],
          intensity: TENSION_ORDINAL[tension] / 3,
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

const TENSION_ORDINAL: Record<TensionLevel, number> = {
  low: 0,
  elevated: 1,
  high: 2,
  severe: 3,
};

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
    | "disaster-federal-declaration"
    | "international-decision";
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
  for (const pending of pendingInternationalDecisions(world))
    if (pending.sequence > afterSequence)
      decisions.push({
        key: `crisis:decision:international:${pending.crisisId}:${pending.sequence}`,
        personId,
        kind: "international-decision",
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
