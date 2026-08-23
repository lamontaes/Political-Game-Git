import { householdMembershipsAt, organizationProfileAt } from "./life-queries";
import type {
  EntityId,
  HistoricalCutoff,
  IsoDate,
  LifeHistoryRecordReference,
  World,
} from "./types";

export interface ResolvedLifeHistorySource {
  readonly reference: LifeHistoryRecordReference;
  readonly personIds: readonly EntityId[];
  readonly effectiveAt: IsoDate;
  readonly sequence: number;
  readonly label: string;
  readonly content: string;
}

export function resolveLifeHistorySource(
  world: World,
  reference: LifeHistoryRecordReference,
): ResolvedLifeHistorySource {
  const h = world.history;
  switch (reference.family) {
    case "work-relationship": {
      const record = requireRecord(h.workRelationships, reference);
      return resolved(
        reference,
        [record.personId],
        earlier(record.recordedAt, record.startedAt),
        record.sequence,
        "Work relationship",
        `${record.kind}; ${record.compensation}; ${record.startedAt}`,
      );
    }
    case "work-status": {
      const record = requireRecord(h.workStatuses, reference);
      const parent = requireParent(
        h.workRelationships,
        record.workRelationshipId,
        reference,
      );
      return resolved(
        reference,
        [parent.personId],
        record.effectiveAt,
        record.sequence,
        "Work status",
        `${record.status}${record.reason ? ` — ${record.reason}` : ""}`,
      );
    }
    case "work-role": {
      const record = requireRecord(h.workRoles, reference);
      const parent = requireParent(
        h.workRelationships,
        record.workRelationshipId,
        reference,
      );
      return resolved(
        reference,
        [parent.personId],
        record.effectiveAt,
        record.sequence,
        "Work role",
        record.title,
      );
    }
    case "household-membership": {
      const record = requireRecord(h.householdMemberships, reference);
      return resolved(
        reference,
        [record.personId],
        record.startedAt,
        record.sequence,
        "Household membership",
        `Household ${record.householdId}`,
      );
    }
    case "household-membership-state": {
      const record = requireRecord(h.householdMembershipStates, reference);
      const parent = requireParent(
        h.householdMemberships,
        record.membershipId,
        reference,
      );
      return resolved(
        reference,
        [parent.personId],
        record.effectiveAt,
        record.sequence,
        "Household membership state",
        `${record.status}; ${record.residenceRole}; ${record.kind}`,
      );
    }
    case "kinship": {
      const record = requireRecord(h.kinshipRelationships, reference);
      return resolved(
        reference,
        record.personIds,
        record.establishedAt,
        record.sequence,
        "Kinship",
        record.kind,
      );
    }
    case "partnership": {
      const record = requireRecord(h.partnerships, reference);
      return resolved(
        reference,
        record.personIds,
        record.startedAt,
        record.sequence,
        "Partnership",
        record.kind,
      );
    }
    case "partnership-state": {
      const record = requireRecord(h.partnershipStates, reference);
      const parent = requireParent(
        h.partnerships,
        record.partnershipId,
        reference,
      );
      return resolved(
        reference,
        parent.personIds,
        record.effectiveAt,
        record.sequence,
        "Partnership state",
        record.status,
      );
    }
    case "care-responsibility": {
      const record = requireRecord(h.careResponsibilities, reference);
      return resolved(
        reference,
        [record.caregiverPersonId, record.recipientPersonId],
        record.startedAt,
        record.sequence,
        "Care responsibility",
        record.kind,
      );
    }
    case "care-state": {
      const record = requireRecord(h.careResponsibilityStates, reference);
      const parent = requireParent(
        h.careResponsibilities,
        record.careResponsibilityId,
        reference,
      );
      return resolved(
        reference,
        [parent.caregiverPersonId, parent.recipientPersonId],
        record.effectiveAt,
        record.sequence,
        "Care responsibility state",
        `${record.status}; ${record.share}; ${record.context}`,
      );
    }
    case "life-commitment": {
      const record = requireRecord(h.lifeCommitments, reference);
      return resolved(
        reference,
        [record.personId],
        record.startsAt,
        record.sequence,
        "Life commitment",
        `${record.label}; ${record.kind}`,
      );
    }
    case "life-load-resolution": {
      const record = requireRecord(h.lifeLoadResolutions, reference);
      return resolved(
        reference,
        [record.personId],
        record.periodEndsAt,
        record.sequence,
        "Life load and recovery",
        `${record.loadBand} load; ${record.effortMode} effort; ${record.futureCapacity} future capacity`,
      );
    }
    case "education-enrollment": {
      const record = requireRecord(h.educationEnrollments, reference);
      const date = earlier(record.recordedAt, record.startedAt);
      return resolved(
        reference,
        [record.personId],
        date,
        record.sequence,
        `Education · ${organizationName(world, record.organizationId, date, record.sequence)}`,
        `${record.programKind}; expected or actual start ${record.startedAt}`,
      );
    }
    case "education-enrollment-state": {
      const record = requireRecord(h.educationEnrollmentStates, reference);
      const parent = requireParent(
        h.educationEnrollments,
        record.enrollmentId,
        reference,
      );
      return resolved(
        reference,
        [parent.personId],
        record.effectiveAt,
        record.sequence,
        `Education state · ${organizationName(world, parent.organizationId, record.effectiveAt, record.sequence)}`,
        `${record.status}; ${record.contextKind}${record.reason ? ` — ${record.reason}` : ""}`,
      );
    }
    case "organization-participation": {
      const record = requireRecord(h.organizationParticipations, reference);
      const date = earlier(record.recordedAt, record.startedAt);
      return resolved(
        reference,
        [record.personId],
        date,
        record.sequence,
        `Organization participation · ${organizationName(world, record.organizationId, date, record.sequence)}`,
        record.kind,
      );
    }
    case "organization-participation-state": {
      const record = requireRecord(
        h.organizationParticipationStates,
        reference,
      );
      const parent = requireParent(
        h.organizationParticipations,
        record.participationId,
        reference,
      );
      return resolved(
        reference,
        [parent.personId],
        record.effectiveAt,
        record.sequence,
        `Participation state · ${organizationName(world, parent.organizationId, record.effectiveAt, record.sequence)}`,
        [record.status, record.roleKind, record.context]
          .filter((value) => value !== null)
          .join("; "),
      );
    }
    case "child-authority": {
      const record = requireRecord(h.childAuthorities, reference);
      const people =
        record.holder.kind === "person"
          ? [record.childPersonId, record.holder.personId]
          : [record.childPersonId];
      return resolved(
        reference,
        people,
        record.establishedAt,
        record.sequence,
        "Child authority",
        `${record.kind}; holder ${authorityHolderLabel(world, record.holder, record.establishedAt, record.sequence)}`,
      );
    }
    case "child-authority-state": {
      const record = requireRecord(h.childAuthorityStates, reference);
      const parent = requireParent(
        h.childAuthorities,
        record.childAuthorityId,
        reference,
      );
      const people =
        parent.holder.kind === "person"
          ? [parent.childPersonId, parent.holder.personId]
          : [parent.childPersonId];
      return resolved(
        reference,
        people,
        record.effectiveAt,
        record.sequence,
        "Child authority state",
        `${record.status}; ${record.basisKind}${record.context ? ` — ${record.context}` : ""}`,
      );
    }
    case "resource-position": {
      const record = requireRecord(h.resourcePositions, reference);
      return resolved(
        reference,
        peopleForEndpoint(
          world,
          record.owner,
          record.openedAt,
          record.sequence,
        ),
        record.openedAt,
        record.sequence,
        "Liquid resource position",
        `${formatMoney(record.openingBalance)} opening position`,
      );
    }
    case "resource-flow": {
      const record = requireRecord(h.resourceFlows, reference);
      const date = earlier(record.recordedAt, record.startsAt);
      return resolved(
        reference,
        peopleForFlow(world, record, date, record.sequence),
        date,
        record.sequence,
        "Resource-flow arrangement",
        `${record.basisKind}; ${endpointLabel(record.source)} → ${endpointLabel(record.recipient)}`,
      );
    }
    case "resource-flow-terms": {
      const record = requireRecord(h.resourceFlowTerms, reference);
      const parent = requireParent(
        h.resourceFlows,
        record.resourceFlowId,
        reference,
      );
      return resolved(
        reference,
        peopleForFlow(world, parent, record.effectiveAt, record.sequence),
        record.effectiveAt,
        record.sequence,
        "Resource-flow terms",
        `${record.status}; ${formatMoney(record.amount)}; ${record.cadenceKind}`,
      );
    }
    case "resource-transfer-outcome": {
      const record = requireRecord(h.resourceTransferOutcomes, reference);
      const parent = requireParent(
        h.resourceFlows,
        record.resourceFlowId,
        reference,
      );
      return resolved(
        reference,
        peopleForFlow(world, parent, record.occurredAt, record.sequence),
        record.occurredAt,
        record.sequence,
        "Resource-transfer outcome",
        `${record.status}; ${formatMoney(record.transferredAmount)} of ${formatMoney(record.attemptedAmount)}`,
      );
    }
    case "resource-obligation": {
      const record = requireRecord(h.resourceObligations, reference);
      const flow = requireParent(
        h.resourceFlows,
        record.resourceFlowId,
        reference,
      );
      return resolved(
        reference,
        peopleForFlow(world, flow, record.establishedAt, record.sequence),
        record.establishedAt,
        record.sequence,
        "Resource obligation",
        `${record.basisKind}${record.principal ? `; principal ${formatMoney(record.principal)}` : ""}`,
      );
    }
    case "resource-obligation-state": {
      const record = requireRecord(h.resourceObligationStates, reference);
      const obligation = requireParent(
        h.resourceObligations,
        record.resourceObligationId,
        reference,
      );
      const flow = requireParent(
        h.resourceFlows,
        obligation.resourceFlowId,
        reference,
      );
      return resolved(
        reference,
        peopleForFlow(world, flow, record.effectiveAt, record.sequence),
        record.effectiveAt,
        record.sequence,
        "Resource obligation state",
        `${record.status}${record.reason ? ` — ${record.reason}` : ""}`,
      );
    }
    case "dwelling": {
      const record = requireRecord(h.dwellings, reference);
      return resolved(
        reference,
        [],
        record.establishedAt,
        record.sequence,
        "Dwelling",
        `${record.locationLabel}; ${record.classification}`,
      );
    }
    case "dwelling-occupancy": {
      const record = requireRecord(h.dwellingOccupancies, reference);
      return resolved(
        reference,
        peopleForEndpoint(
          world,
          record.occupant,
          record.startedAt,
          record.sequence,
        ),
        record.startedAt,
        record.sequence,
        "Dwelling occupancy",
        `Dwelling ${record.dwellingId}`,
      );
    }
    case "dwelling-occupancy-state": {
      const record = requireRecord(h.dwellingOccupancyStates, reference);
      const parent = requireParent(
        h.dwellingOccupancies,
        record.dwellingOccupancyId,
        reference,
      );
      return resolved(
        reference,
        peopleForEndpoint(
          world,
          parent.occupant,
          record.effectiveAt,
          record.sequence,
        ),
        record.effectiveAt,
        record.sequence,
        "Dwelling occupancy state",
        `${record.status}; ${record.residenceRole}; ${record.kind}`,
      );
    }
    case "housing-tenure": {
      const record = requireRecord(h.housingTenures, reference);
      return resolved(
        reference,
        peopleForEndpoint(
          world,
          record.holder,
          record.startedAt,
          record.sequence,
        ),
        record.startedAt,
        record.sequence,
        "Housing tenure",
        `${record.kind}; dwelling ${record.dwellingId}`,
      );
    }
    case "housing-tenure-state": {
      const record = requireRecord(h.housingTenureStates, reference);
      const parent = requireParent(
        h.housingTenures,
        record.housingTenureId,
        reference,
      );
      return resolved(
        reference,
        peopleForEndpoint(
          world,
          parent.holder,
          record.effectiveAt,
          record.sequence,
        ),
        record.effectiveAt,
        record.sequence,
        "Housing tenure state",
        `${record.status}${record.context ? ` — ${record.context}` : ""}`,
      );
    }
    default:
      throw new Error(
        `Unsupported life-history record family: ${String((reference as { family?: unknown }).family)}`,
      );
  }
}

export function assertLifeHistorySourceAvailable(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
  reference: LifeHistoryRecordReference,
): ResolvedLifeHistorySource {
  const source = resolveLifeHistorySource(world, reference);
  if (
    !source.personIds.includes(personId) ||
    source.effectiveAt > cutoff.asOfDate ||
    source.sequence >= cutoff.historySequenceExclusive
  ) {
    throw new Error(
      `Unavailable life-history source: ${reference.family}:${reference.recordId}`,
    );
  }
  return source;
}

export function lifeHistoryReferenceKey(
  reference: LifeHistoryRecordReference,
): string {
  return `${reference.family}:${reference.recordId}`;
}

function resolved(
  reference: LifeHistoryRecordReference,
  personIds: readonly EntityId[],
  effectiveAt: IsoDate,
  sequence: number,
  label: string,
  content: string,
): ResolvedLifeHistorySource {
  return {
    reference: { ...reference },
    personIds: [...new Set(personIds)].sort(),
    effectiveAt,
    sequence,
    label,
    content,
  };
}

function requireRecord<T extends { readonly id: EntityId }>(
  records: readonly T[],
  reference: LifeHistoryRecordReference,
): T {
  const record = records.find(
    (candidate) => candidate.id === reference.recordId,
  );
  if (!record) {
    throw new Error(
      `Missing life-history source: ${reference.family}:${reference.recordId}`,
    );
  }
  return record;
}

function requireParent<T extends { readonly id: EntityId }>(
  records: readonly T[],
  id: EntityId,
  reference: LifeHistoryRecordReference,
): T {
  const record = records.find((candidate) => candidate.id === id);
  if (!record) {
    throw new Error(
      `Life-history source has a missing parent: ${reference.family}:${reference.recordId}`,
    );
  }
  return record;
}

function earlier(left: IsoDate, right: IsoDate): IsoDate {
  return left < right ? left : right;
}

function peopleForFlow(
  world: World,
  flow: World["history"]["resourceFlows"][number],
  date: IsoDate,
  sequence: number,
): readonly EntityId[] {
  return [
    ...peopleForEndpoint(world, flow.source, date, sequence),
    ...peopleForEndpoint(world, flow.recipient, date, sequence),
  ];
}

function peopleForEndpoint(
  world: World,
  endpoint:
    | World["history"]["resourceFlows"][number]["source"]
    | World["history"]["resourcePositions"][number]["owner"]
    | World["history"]["dwellingOccupancies"][number]["occupant"]
    | World["history"]["housingTenures"][number]["holder"],
  date: IsoDate,
  sequence: number,
): readonly EntityId[] {
  switch (endpoint.kind) {
    case "person":
      return [endpoint.personId];
    case "household":
      return world.personOrder.filter((personId) =>
        householdMembershipsAt(world, personId, {
          asOfDate: date,
          historySequenceExclusive: sequence + 1,
        }).some(
          (membership) =>
            membership.membership.householdId === endpoint.householdId,
        ),
      );
    case "organization":
      return [];
  }
}

function endpointLabel(
  endpoint: World["history"]["resourceFlows"][number]["source"],
): string {
  switch (endpoint.kind) {
    case "person":
      return `person ${endpoint.personId}`;
    case "household":
      return `household ${endpoint.householdId}`;
    case "organization":
      return `organization ${endpoint.organizationId}`;
  }
}

function formatMoney(
  amount: World["history"]["resourceFlowTerms"][number]["amount"],
): string {
  return `${amount.currency} ${amount.minorUnits} minor units`;
}

function organizationName(
  world: World,
  organizationId: EntityId,
  asOfDate: IsoDate,
  historySequenceExclusive: number,
): string {
  return (
    organizationProfileAt(world, organizationId, {
      asOfDate,
      historySequenceExclusive,
    })?.name ?? organizationId
  );
}

function authorityHolderLabel(
  world: World,
  holder: World["history"]["childAuthorities"][number]["holder"],
  asOfDate: IsoDate,
  historySequenceExclusive: number,
): string {
  if (holder.kind === "person") {
    const person = world.people[holder.personId];
    return person
      ? `${person.givenName} ${person.familyName}`
      : holder.personId;
  }
  return organizationName(
    world,
    holder.organizationId,
    asOfDate,
    historySequenceExclusive,
  );
}
