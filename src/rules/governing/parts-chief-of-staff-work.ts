// STOPGAP RULES3-GOV-059: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/state-governing.ts :: chiefOfStaffWork.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 574: relationship.organizationId === organizationId &&       relationship.kind === "employment:executive-staff" &&       relationship.sequence < cutoff.historySequenceExclusive &&       (relationship.startedAt < relationship.recordedAt         ? relations */
export function chiefOfStaffWorkRule1(facts: {
  readonly relationshipOrganizationId: string | null;
  readonly organizationId: string;
  readonly relationshipKind: string;
  readonly relationshipSequence: number;
  readonly cutoffHistorySequenceExclusive: number;
  readonly relationshipStartedAt: string;
  readonly relationshipRecordedAt: string;
  readonly cutoffAsOfDate: string;
  readonly workStatusAtWorldRelationshipIdCutoffStatus: string | undefined;
  readonly workRoleAtWorldRelationshipIdCutoffOccupationClassification:
    string | null | undefined;
  readonly CHIEF_OF_STAFF_CLASSIFICATION: string;
}) {
  return (
    facts.relationshipOrganizationId! === facts.organizationId &&
    facts.relationshipKind === "employment:executive-staff" &&
    facts.relationshipSequence < facts.cutoffHistorySequenceExclusive &&
    (facts.relationshipStartedAt < facts.relationshipRecordedAt
      ? facts.relationshipStartedAt
      : facts.relationshipRecordedAt) <= facts.cutoffAsOfDate &&
    facts.relationshipStartedAt <= facts.cutoffAsOfDate &&
    facts.workStatusAtWorldRelationshipIdCutoffStatus! === "active" &&
    facts.workRoleAtWorldRelationshipIdCutoffOccupationClassification! ===
      facts.CHIEF_OF_STAFF_CLASSIFICATION
  );
}

/** Legacy line 588: active.length > 1       ? new Map(world.personOrder.map((personId, index) => [personId, index]))       : new Map<EntityId, number>() */
export function chiefOfStaffWorkRule2(facts: {
  readonly activeLength: number;
  readonly newMapWorldPersonOrderMapPersonIdIndexPersonIdIndex: unknown;
  readonly newMapEntityIdNumber: unknown;
}) {
  return facts.activeLength > 1
    ? facts.newMapWorldPersonOrderMapPersonIdIndexPersonIdIndex
    : facts.newMapEntityIdNumber;
}

/** Legacy line 594: (personOrder.get(left.personId) ?? Infinity) -           (personOrder.get(right.personId) ?? Infinity) ||         left.sequence - right.sequence */
export function chiefOfStaffWorkRule3(facts: {
  readonly personOrderGetLeftPersonId: number | undefined;
  readonly personOrderGetRightPersonId: number | undefined;
  readonly leftSequence: number;
  readonly rightSequence: number;
}) {
  return (
    (facts.personOrderGetLeftPersonId! ?? Infinity) -
      (facts.personOrderGetRightPersonId! ?? Infinity) ||
    facts.leftSequence - facts.rightSequence
  );
}
