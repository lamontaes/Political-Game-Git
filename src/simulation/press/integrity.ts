import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import type { EntityId, IsoDate, World } from "../types";
import {
  EVIDENCE_BEARINGS,
  LEAD_ROUTES,
  MATTER_RESPONSES,
  MEDIA_ACTIVE_ASSIGNMENT_CAPACITY,
  MEDIA_BEATS,
  MEDIA_CADENCES,
  MEDIA_MEDIUMS,
  MEDIA_PRODUCTS,
  MEDIA_RESOURCE_TIERS,
  MEDIA_SCOPES,
  MISCONDUCT_FAMILIES,
  PRESS_POLICY_VERSION,
  PROCEDURE_KEYS,
  PROCEEDING_OUTCOMES,
  RESPONDER_ROLES,
  SOURCE_TERMS,
  STORY_DECISIONS,
  STORY_FAMILIES,
  mediaOutletKey,
  sourceTermsAttributable,
  sourceTermsPubliclyUsable,
  type MediaOutletRecord,
  type PressRecord,
  type ReporterRoleRecord,
  type StoryDecision,
} from "./records";

const JOURNALISM = "profession:journalism";

/** Decisions after which a lead still occupies a reporter's capacity. */
export const ACTIVE_STORY_DECISIONS: readonly StoryDecision[] = [
  "assigned",
  "response-requested",
  "subject-responded",
  "held",
];

export function pressHistoryRecords(world: World): readonly PressRecord[] {
  return world.history.pressRecords ?? [];
}

export function pressEntityExists(world: World, entityId: EntityId): boolean {
  return pressHistoryRecords(world).some((record) => record.id === entityId);
}

export function pressEntityAvailableAt(
  world: World,
  entityId: EntityId,
  asOfDate: IsoDate,
  historySequenceExclusive: number,
): boolean {
  return pressHistoryRecords(world).some(
    (record) =>
      record.id === entityId &&
      record.recordedAt <= asOfDate &&
      record.sequence < historySequenceExclusive,
  );
}

/**
 * Structural and referential integrity for the PRESS46 family. Every
 * reference must already exist earlier in the one contiguous history, and
 * derived fields (usability, attribution, capacity) must agree with the rules
 * that derive them.
 */
/**
 * Press records are append-only and reference only earlier history, so an
 * unchanged record array that already passed stays valid as the World grows.
 * A loaded or edited save is a new array and is checked in full.
 */
const VALIDATED = new WeakMap<readonly PressRecord[], World["id"]>();

export function assertPressIntegrity(world: World, ids: Set<EntityId>): void {
  const records = pressHistoryRecords(world);
  if (records.length === 0) return;
  if (VALIDATED.get(records) === world.id) {
    for (const record of records) {
      if (ids.has(record.id)) {
        throw new Error(`Duplicate entity ID: ${record.id}`);
      }
      ids.add(record.id);
    }
    return;
  }
  validatePressRecords(world, records, ids);
  VALIDATED.set(records, world.id);
}

export function validatePressRecords(
  world: World,
  records: readonly PressRecord[],
  ids: Set<EntityId>,
): void {
  const sequenceOf = new Map<EntityId, number>();
  const note = (list: readonly { id: EntityId; sequence: number }[]) => {
    for (const item of list) sequenceOf.set(item.id, item.sequence);
  };
  note(world.history.events);
  note(world.history.claims);
  note(world.history.knowledge);
  note(world.history.evidenceArtifacts);
  note(world.history.resourceFlows);
  note(world.history.decisionTraces);
  note(world.history.organizations);
  note(world.history.workRelationships);
  note(world.history.workRoles);
  note(world.history.publications ?? []);

  const earlier = (id: EntityId, sequence: number, label: string) => {
    const at = sequenceOf.get(id);
    if (at === undefined || at >= sequence) {
      throw new Error(`Press ${label} reference is unavailable: ${id}`);
    }
  };
  const person = (id: EntityId, label: string) => {
    if (!world.people[id]) {
      throw new Error(`Press ${label} person is missing: ${id}`);
    }
  };
  const jurisdiction = (id: EntityId | null, label: string) => {
    if (id !== null && !world.jurisdictions[id]) {
      throw new Error(`Press ${label} jurisdiction is missing: ${id}`);
    }
  };

  const byId = new Map<EntityId, PressRecord>();
  const stableKeys = new Set<string>();
  const outletActive = new Map<EntityId, Set<EntityId>>();
  const leadDecision = new Map<EntityId, StoryDecision>();
  const closedProceedings = new Set<EntityId>();
  const reporterRoles: ReporterRoleRecord[] = [];
  let previousSequence = -1;

  const prior = <K extends PressRecord["kind"]>(
    id: EntityId,
    kind: K,
    label: string,
  ): Extract<PressRecord, { kind: K }> => {
    const found = byId.get(id);
    if (!found || found.kind !== kind) {
      throw new Error(`Press ${label} must reference an earlier ${kind}.`);
    }
    return found as Extract<PressRecord, { kind: K }>;
  };

  for (const record of records) {
    if (record.sequence <= previousSequence) {
      throw new Error("Press history is not stored in append-sequence order.");
    }
    previousSequence = record.sequence;
    if (ids.has(record.id)) {
      throw new Error(`Duplicate entity ID: ${record.id}`);
    }
    ids.add(record.id);
    if (!record.stableKey.trim() || stableKeys.has(record.stableKey)) {
      throw new Error(`Invalid or duplicate press key: ${record.stableKey}`);
    }
    stableKeys.add(record.stableKey);
    if (
      record.id !==
      createStableId("press-record", `${world.id}:${record.stableKey}`)
    ) {
      throw new Error(`Press record ID does not match its key: ${record.id}`);
    }
    if (makeIsoDate(record.recordedAt) > world.currentDate) {
      throw new Error(`Press record is dated in the future: ${record.id}`);
    }
    const seq = record.sequence;

    switch (record.kind) {
      case "media-outlet": {
        member(MEDIA_PRODUCTS, record.product, "media product");
        member(MEDIA_SCOPES, record.scope, "media scope");
        member(MEDIA_RESOURCE_TIERS, record.resourceTier, "resource tier");
        member(MEDIA_CADENCES, record.cadence, "cadence");
        list(MEDIA_MEDIUMS, record.mediums, "medium");
        list(MEDIA_BEATS, record.beats, "beat");
        text(record.name, "outlet name");
        text(record.provenanceNote, "outlet provenance");
        earlier(record.organizationId, seq, "outlet organization");
        if (record.policyVersion !== PRESS_POLICY_VERSION) {
          throw new Error(`Outlet uses an unknown policy: ${record.id}`);
        }
        if (
          (record.scope === "national") !==
          (record.primaryJurisdictionIds.length === 0)
        ) {
          throw new Error(
            `Only a national outlet may have no primary geography: ${record.id}`,
          );
        }
        for (const id of record.primaryJurisdictionIds) {
          jurisdiction(id, "outlet");
        }
        outletActive.set(record.id, new Set());
        break;
      }
      case "reporter-role": {
        const outlet = prior(record.outletId, "media-outlet", "reporter");
        person(record.personId, "reporter");
        earlier(record.workRoleId, seq, "reporter work role");
        const role = world.history.workRoles.find(
          (candidate) => candidate.id === record.workRoleId,
        );
        const relationship = world.history.workRelationships.find(
          (candidate) => candidate.id === record.workRelationshipId,
        );
        if (
          !role ||
          !relationship ||
          role.workRelationshipId !== relationship.id ||
          relationship.personId !== record.personId ||
          relationship.organizationId !== outlet.organizationId ||
          role.occupationClassification !== JOURNALISM
        ) {
          throw new Error(
            `Reporter role must be the person's journalism role at the outlet: ${record.id}`,
          );
        }
        list(MEDIA_BEATS, record.beats, "beat");
        for (const id of record.geographyJurisdictionIds) {
          jurisdiction(id, "reporter");
        }
        text(record.title, "reporter title");
        reporterRoles.push(record);
        break;
      }
      case "story-lead": {
        prior(record.outletId, "media-outlet", "lead");
        member(STORY_FAMILIES, record.family, "story family");
        member(LEAD_ROUTES, record.route, "lead route");
        if (record.basisEventIds.length === 0) {
          throw new Error(`A story lead needs an actual basis: ${record.id}`);
        }
        for (const id of record.basisEventIds) earlier(id, seq, "lead basis");
        for (const id of record.subjectPersonIds) person(id, "lead subject");
        jurisdiction(record.jurisdictionId, "lead");
        if (record.matterId) prior(record.matterId, "matter", "lead");
        if (record.followsPublicationId) {
          earlier(record.followsPublicationId, seq, "followed publication");
        }
        break;
      }
      case "story-disposition": {
        const lead = prior(record.leadId, "story-lead", "disposition");
        member(STORY_DECISIONS, record.decision, "story decision");
        text(record.reasonKey, "disposition reason");
        if (record.eventId) earlier(record.eventId, seq, "disposition event");
        if (record.decisionTraceId) {
          earlier(record.decisionTraceId, seq, "disposition decision");
        }
        for (const id of record.contributionIds) {
          const contribution = prior(
            id,
            "source-contribution",
            "story contribution",
          );
          const agreement = prior(
            contribution.agreementId,
            "source-agreement",
            "story contribution agreement",
          );
          if (
            !agreement.publiclyUsable ||
            agreement.outletId !== lead.outletId
          ) {
            throw new Error(
              `A story may use only publishable contributions made to its outlet: ${record.id}`,
            );
          }
        }
        if (record.reporterPersonId !== null) {
          const hasRole = reporterRoles.some(
            (role) =>
              role.personId === record.reporterPersonId &&
              role.outletId === lead.outletId,
          );
          if (!hasRole) {
            throw new Error(
              `Only the outlet's own reporter may carry its story: ${record.id}`,
            );
          }
        }
        if (
          record.decision === "published" ||
          record.decision === "corrected"
        ) {
          if (!record.publicationId || !record.eventId) {
            throw new Error(
              `A published story needs its event and publication: ${record.id}`,
            );
          }
          const publication = (world.history.publications ?? []).find(
            (candidate) => candidate.id === record.publicationId,
          );
          if (
            !publication ||
            publication.outletKey !== mediaOutletKey(lead.outletId)
          ) {
            throw new Error(
              `Story publication belongs to another outlet: ${record.id}`,
            );
          }
        } else if (record.publicationId !== null) {
          throw new Error(
            `Only a published step carries a publication: ${record.id}`,
          );
        }
        if (
          (record.decision === "response-requested") !==
          (record.responseDueAt !== null)
        ) {
          throw new Error(
            `Only a response request carries a response deadline: ${record.id}`,
          );
        }
        const active = outletActive.get(lead.outletId)!;
        const wasActive = active.has(lead.id);
        if (ACTIVE_STORY_DECISIONS.includes(record.decision)) {
          if (!wasActive && record.decision !== "assigned") {
            throw new Error(
              `A story must be assigned before it is worked: ${record.id}`,
            );
          }
          active.add(lead.id);
          const outlet = byId.get(lead.outletId) as MediaOutletRecord;
          if (
            active.size > MEDIA_ACTIVE_ASSIGNMENT_CAPACITY[outlet.resourceTier]
          ) {
            throw new Error(
              `Outlet exceeds its authored assignment capacity: ${record.id}`,
            );
          }
        } else {
          active.delete(lead.id);
        }
        const previous = leadDecision.get(lead.id);
        if (
          (previous === "published" || previous === "corrected") &&
          record.decision !== "corrected"
        ) {
          throw new Error(
            `A published story changes only by correction: ${record.id}`,
          );
        }
        if (previous === "declined") {
          throw new Error(`A declined lead cannot be reopened: ${record.id}`);
        }
        leadDecision.set(lead.id, record.decision);
        break;
      }
      case "source-agreement": {
        const outlet = prior(record.outletId, "media-outlet", "agreement");
        member(SOURCE_TERMS, record.terms, "source terms");
        person(record.sourcePersonId, "source");
        if (record.sourcePersonId === record.reporterPersonId) {
          throw new Error("A source cannot also be the reporter.");
        }
        if (
          !reporterRoles.some(
            (role) =>
              role.personId === record.reporterPersonId &&
              role.outletId === outlet.id,
          )
        ) {
          throw new Error(
            `Ground rules require the outlet's own reporter: ${record.id}`,
          );
        }
        if (record.leadId) prior(record.leadId, "story-lead", "agreement");
        earlier(record.agreementEventId, seq, "agreement event");
        if (record.terms === "background") {
          text(record.attributionLabel, "background attribution");
        } else if (record.attributionLabel !== null) {
          throw new Error(
            `Only background terms carry an attribution label: ${record.id}`,
          );
        }
        if (
          record.terms === "deep-background" &&
          !outlet.acceptsDeepBackground
        ) {
          throw new Error(
            `This outlet does not accept deep background: ${record.id}`,
          );
        }
        if (
          record.publiclyUsable !== sourceTermsPubliclyUsable(record.terms) ||
          record.attributable !== sourceTermsAttributable(record.terms)
        ) {
          throw new Error(
            `Agreement usability disagrees with its terms: ${record.id}`,
          );
        }
        break;
      }
      case "source-contribution": {
        const agreement = prior(
          record.agreementId,
          "source-agreement",
          "contribution",
        );
        earlier(record.contributionEventId, seq, "contribution event");
        if (record.claimId) {
          earlier(record.claimId, seq, "contribution claim");
          const claim = world.history.claims.find(
            (candidate) => candidate.id === record.claimId,
          );
          if (claim?.speakerPersonId !== agreement.sourcePersonId) {
            throw new Error(
              `A contribution claim must be the source's own: ${record.id}`,
            );
          }
        }
        for (const id of record.disclosedEventIds) {
          earlier(id, seq, "disclosed event");
        }
        for (const id of record.leakedEvidenceArtifactIds) {
          earlier(id, seq, "leaked evidence");
        }
        if (record.leak !== record.leakedEvidenceArtifactIds.length > 0) {
          throw new Error(`A leak must name what was leaked: ${record.id}`);
        }
        if (
          record.claimId === null &&
          record.disclosedEventIds.length === 0 &&
          !record.leak
        ) {
          throw new Error(
            `A contribution must contain something: ${record.id}`,
          );
        }
        for (const id of record.subjectPersonIds) person(id, "subject");
        break;
      }
      case "financial-occurrence": {
        member(MISCONDUCT_FAMILIES, record.family, "misconduct family");
        if (record.actorPersonIds.length === 0) {
          throw new Error(`An occurrence needs its actors: ${record.id}`);
        }
        for (const id of record.actorPersonIds) person(id, "occurrence actor");
        earlier(record.occurrenceEventId, seq, "occurrence event");
        const event = world.history.events.find(
          (candidate) => candidate.id === record.occurrenceEventId,
        );
        if (event?.visibility === "public") {
          throw new Error(
            `An underlying occurrence is not itself public: ${record.id}`,
          );
        }
        for (const id of record.resourceFlowIds) {
          earlier(id, seq, "occurrence flow");
        }
        for (const id of record.recordEvidenceArtifactIds) {
          earlier(id, seq, "occurrence evidence");
        }
        if (
          (record.family === "M1" || record.family === "M7") &&
          record.resourceFlowIds.length === 0
        ) {
          throw new Error(
            `A money misuse must point at an actual payment: ${record.id}`,
          );
        }
        if (record.family === "M2") text(record.dutyReference, "duty source");
        jurisdiction(record.jurisdictionId, "occurrence");
        break;
      }
      case "matter": {
        member(MISCONDUCT_FAMILIES, record.family, "misconduct family");
        if (record.subjectPersonIds.length === 0) {
          throw new Error(`A matter needs its subjects: ${record.id}`);
        }
        for (const id of record.subjectPersonIds) person(id, "matter subject");
        earlier(record.originEventId, seq, "matter origin");
        if (record.occurrenceId) {
          const occurrence = prior(
            record.occurrenceId,
            "financial-occurrence",
            "matter",
          );
          if (occurrence.family !== record.family) {
            throw new Error(`Matter family disagrees with its occurrence.`);
          }
        }
        jurisdiction(record.jurisdictionId, "matter");
        break;
      }
      case "matter-allegation": {
        prior(record.matterId, "matter", "allegation");
        earlier(record.allegationEventId, seq, "allegation event");
        if (record.claimId) earlier(record.claimId, seq, "allegation claim");
        if (record.allegerPersonId) person(record.allegerPersonId, "alleger");
        text(record.statement, "allegation statement");
        break;
      }
      case "matter-evidence-link": {
        prior(record.matterId, "matter", "evidence link");
        earlier(record.evidenceArtifactId, seq, "matter evidence");
        member(EVIDENCE_BEARINGS, record.bearing, "evidence bearing");
        break;
      }
      case "matter-proceeding": {
        prior(record.matterId, "matter", "proceeding");
        member(PROCEDURE_KEYS, record.procedureKey, "procedure");
        text(record.institutionLabel, "institution");
        earlier(record.openingEventId, seq, "proceeding opening");
        if (record.respondentPersonIds.length === 0) {
          throw new Error(`A proceeding needs its respondents: ${record.id}`);
        }
        for (const id of record.respondentPersonIds) person(id, "respondent");
        if (record.complainantPersonId) {
          person(record.complainantPersonId, "complainant");
        }
        if (
          (record.procedureKey === "simulated-inquiry") !==
          (record.simulatedDisclosure !== null)
        ) {
          throw new Error(
            `Only a simulated inquiry carries, and must carry, its disclosure: ${record.id}`,
          );
        }
        break;
      }
      case "proceeding-step": {
        prior(record.proceedingId, "matter-proceeding", "step");
        if (closedProceedings.has(record.proceedingId)) {
          throw new Error(
            `A closed proceeding has no later step: ${record.id}`,
          );
        }
        text(record.step, "proceeding step");
        earlier(record.eventId, seq, "step event");
        if (record.outcome !== null) {
          member(PROCEEDING_OUTCOMES, record.outcome, "proceeding outcome");
        }
        if ((record.nextDueAt === null) !== (record.nextDueBasis === null)) {
          throw new Error(`A step deadline needs its basis: ${record.id}`);
        }
        if (record.closes) {
          if (record.nextDueAt !== null) {
            throw new Error(`A closing step sets no deadline: ${record.id}`);
          }
          closedProceedings.add(record.proceedingId);
        }
        for (const id of record.evidenceArtifactIds) {
          earlier(id, seq, "step evidence");
        }
        break;
      }
      case "matter-response": {
        prior(record.matterId, "matter", "response");
        person(record.actorPersonId, "responder");
        member(RESPONDER_ROLES, record.actorRole, "responder role");
        member(MATTER_RESPONSES, record.response, "matter response");
        earlier(record.eventId, seq, "response event");
        if (record.decisionTraceId) {
          earlier(record.decisionTraceId, seq, "response decision");
        }
        for (const id of record.knowledgeIds) {
          earlier(id, seq, "response knowledge");
          const knowledge = world.history.knowledge.find(
            (candidate) => candidate.id === id,
          );
          if (knowledge?.personId !== record.actorPersonId) {
            throw new Error(
              `A response may rest only on the responder's knowledge: ${record.id}`,
            );
          }
        }
        break;
      }
      default: {
        const unknown: never = record;
        throw new Error(`Unknown press record: ${JSON.stringify(unknown)}`);
      }
    }
    byId.set(record.id, record);
    sequenceOf.set(record.id, record.sequence);
  }
}

/** Sequence of a press record, for publication source-record checks. */
export function pressRecordSequence(world: World, id: EntityId): number | null {
  return (
    pressHistoryRecords(world).find((record) => record.id === id)?.sequence ??
    null
  );
}

function member<T extends string>(
  values: readonly T[],
  value: string,
  label: string,
): void {
  if (!(values as readonly string[]).includes(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function list<T extends string>(
  values: readonly T[],
  items: readonly string[],
  label: string,
): void {
  if (items.length === 0 || new Set(items).size !== items.length) {
    throw new Error(`Press ${label} list must be non-empty and unique.`);
  }
  for (const item of items) member(values, item, label);
}

function text(value: string | null, label: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Press ${label} must not be empty.`);
  }
}
