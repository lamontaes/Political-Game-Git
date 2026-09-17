import { isPersonAliveAt } from "../vitality-integrity";
import {
  householdMembershipsAt,
  kinshipRelationshipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import type { EntityId, EventVisibility, IsoDate, World } from "../types";
import { MORTALITY_CAUSE_KEY } from "./mortality";
import { pendingDisasterDecisions } from "./disaster";
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

/**
 * One death reaches one recipient once.
 *
 * B (people and information) writes family knowledge and grief from these;
 * D (governing) reads the office-continuity notice instead. The same death
 * produces both, and neither is the other's duplicate. `effectKey` is stable
 * for (death, recipient, relation), so a re-read after any time advance
 * returns the same key and a consumer that stored it writes nothing again.
 */
export interface PersonDeathRecipientNotice {
  readonly effectKey: string;
  readonly sequence: number;
  readonly deathEventId: EntityId;
  readonly deathRecordId: EntityId;
  /** The person who died. */
  readonly personId: EntityId;
  readonly diedAt: IsoDate;
  readonly recipientPersonId: EntityId;
  /** The relation CRISIS can see; never a claim about closeness. */
  readonly relationKind: string;
  readonly controlledPerson: boolean;
  readonly causeKey: string;
  readonly causeResolved: boolean;
  /**
   * Whether the CAUSE may be told to this recipient, which is separate from
   * the fact of the death. False unless a health disclosure actually reached
   * them (or was public). Never inferred from the cause key.
   */
  readonly disclosable: boolean;
  /** The disclosure that makes the cause tellable, when one does. */
  readonly disclosureRecordId: EntityId | null;
  /** True when this recipient already knows the death event. */
  readonly alreadyKnew: boolean;
}

/**
 * Every living recipient of every death after `afterSequence`: household
 * members and recorded kin as CRISIS sees them, each once, with the strongest
 * relation it can name.
 */
export function crisisPersonDeathRecipientNotices(
  world: World,
  options: { readonly afterSequence?: number } = {},
): readonly PersonDeathRecipientNotice[] {
  const notices: PersonDeathRecipientNotice[] = [];
  for (const death of crisisPersonDeathNotices(world, options)) {
    const cutoff = {
      asOfDate: death.diedAt,
      historySequenceExclusive: world.history.nextSequence,
    };
    const relations = new Map<EntityId, string>();
    for (const relationship of kinshipRelationshipsAt(
      world,
      death.personId,
      cutoff,
    )) {
      const other = relationship.personIds.find((id) => id !== death.personId);
      if (other && !relations.has(other))
        relations.set(other, relationship.kind);
    }
    for (const membership of householdMembershipsAt(
      world,
      death.personId,
      cutoff,
    )) {
      for (const memberId of peopleInHouseholdAt(
        world,
        membership.household.id,
        cutoff,
      )) {
        if (memberId === death.personId) continue;
        if (!relations.has(memberId))
          relations.set(memberId, "household:member");
      }
    }
    const disclosures = crisisRecords(world).filter(
      (record) =>
        record.kind === "health-disclosure" &&
        record.personId === death.personId,
    );
    for (const [recipientPersonId, relationKind] of [...relations].sort(
      (a, b) => a[0].localeCompare(b[0]),
    )) {
      if (!world.people[recipientPersonId]) continue;
      if (!isPersonAliveAt(world, recipientPersonId, cutoff)) continue;
      const disclosure = disclosures.find(
        (record) =>
          record.kind === "health-disclosure" &&
          (record.access === "public" ||
            record.recipientIds.includes(recipientPersonId)),
      );
      notices.push({
        effectKey: `crisis:person-death:${death.deathRecordId}:${recipientPersonId}:${relationKind}`,
        sequence: death.sequence,
        deathEventId: death.deathEventId,
        deathRecordId: death.deathRecordId,
        personId: death.personId,
        diedAt: death.diedAt,
        recipientPersonId,
        relationKind,
        controlledPerson: death.controlledPerson,
        causeKey: death.causeKey,
        causeResolved: death.causeResolved,
        disclosable: death.causeResolved && disclosure !== undefined,
        disclosureRecordId: disclosure?.id ?? null,
        alreadyKnew: world.history.knowledge.some(
          (record) =>
            record.personId === recipientPersonId &&
            record.eventId === death.deathEventId,
        ),
      });
    }
  }
  return notices;
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
