import type {
  CurrencyCode,
  DwellingOccupancy,
  DwellingOccupancyStateRecord,
  EntityId,
  HistoricalCutoff,
  HousingTenure,
  HousingTenureStateRecord,
  MoneyAmount,
  ResourceEndpoint,
  ResourceCadenceKind,
  ResourceFlow,
  ResourceFlowTermsRecord,
  ResourceObligation,
  ResourceObligationStateRecord,
  ResourcePositionOwner,
  ResourceTransferOutcome,
  World,
} from "./types";
import { isOpenTaxonomyKey, RESOURCE_CADENCE_NAMESPACES } from "./taxonomy";

export function currentResourceCutoff(world: World): HistoricalCutoff {
  return {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
}

export function resourceFlowTermsHistory(
  world: World,
  resourceFlowId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): readonly ResourceFlowTermsRecord[] {
  return world.history.resourceFlowTerms.filter(
    (record) =>
      record.resourceFlowId === resourceFlowId && available(record, cutoff),
  );
}

export function resourceFlowTermsAt(
  world: World,
  resourceFlowId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): ResourceFlowTermsRecord | undefined {
  return resourceFlowTermsHistory(world, resourceFlowId, cutoff).at(-1);
}

export function resourceTransferOutcomesForFlow(
  world: World,
  resourceFlowId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): readonly ResourceTransferOutcome[] {
  return world.history.resourceTransferOutcomes.filter(
    (record) =>
      record.resourceFlowId === resourceFlowId &&
      availableOn(record, record.occurredAt, cutoff),
  );
}

export function resourceFlowsForEndpoint(
  world: World,
  endpoint: ResourceEndpoint,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): readonly ResourceFlow[] {
  return world.history.resourceFlows.filter(
    (record) =>
      availableOn(
        record,
        earlier(record.recordedAt, record.startsAt),
        cutoff,
      ) &&
      (sameEndpoint(record.source, endpoint) ||
        sameEndpoint(record.recipient, endpoint)),
  );
}

export interface ResourcePositionSnapshot {
  readonly positionId: EntityId;
  readonly owner: ResourcePositionOwner;
  readonly cutoff: HistoricalCutoff;
  readonly openingBalance: MoneyAmount;
  readonly inflows: MoneyAmount;
  readonly outflows: MoneyAmount;
  readonly liquidBalance: MoneyAmount;
  readonly outcomeIds: readonly EntityId[];
}

export function resourcePositionAt(
  world: World,
  owner: ResourcePositionOwner,
  currency: CurrencyCode,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): ResourcePositionSnapshot | undefined {
  const position = world.history.resourcePositions.find(
    (record) =>
      samePositionOwner(record.owner, owner) &&
      record.openingBalance.currency === currency &&
      availableOn(record, record.openedAt, cutoff),
  );
  if (!position) return undefined;
  const endpoint = positionOwnerEndpoint(owner);
  let inflows = 0;
  let outflows = 0;
  const outcomeIds: EntityId[] = [];
  for (const outcome of world.history.resourceTransferOutcomes) {
    if (
      outcome.sequence <= position.sequence ||
      outcome.sequence >= cutoff.historySequenceExclusive ||
      outcome.occurredAt < position.openedAt ||
      outcome.occurredAt > cutoff.asOfDate ||
      outcome.transferredAmount.currency !== currency ||
      outcome.transferredAmount.minorUnits === 0
    ) {
      continue;
    }
    const flow = world.history.resourceFlows.find(
      (record) => record.id === outcome.resourceFlowId,
    );
    if (!flow) continue;
    let used = false;
    if (sameEndpoint(flow.recipient, endpoint)) {
      inflows = addExact(inflows, outcome.transferredAmount.minorUnits);
      used = true;
    }
    if (sameEndpoint(flow.source, endpoint)) {
      outflows = addExact(outflows, outcome.transferredAmount.minorUnits);
      used = true;
    }
    if (used) outcomeIds.push(outcome.id);
  }
  const liquidMinorUnits = addExact(
    addExact(position.openingBalance.minorUnits, inflows),
    -outflows,
  );
  return {
    positionId: position.id,
    owner: { ...owner },
    cutoff: { ...cutoff },
    openingBalance: { ...position.openingBalance },
    inflows: money(inflows, currency),
    outflows: money(outflows, currency),
    liquidBalance: money(liquidMinorUnits, currency),
    outcomeIds,
  };
}

export function resourceObligationStateHistory(
  world: World,
  resourceObligationId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): readonly ResourceObligationStateRecord[] {
  return world.history.resourceObligationStates.filter(
    (record) =>
      record.resourceObligationId === resourceObligationId &&
      available(record, cutoff),
  );
}

export function resourceObligationStateAt(
  world: World,
  resourceObligationId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): ResourceObligationStateRecord | undefined {
  return resourceObligationStateHistory(world, resourceObligationId, cutoff).at(
    -1,
  );
}

export function activeResourceObligationsForOwner(
  world: World,
  owner: ResourcePositionOwner,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): readonly ResourceObligation[] {
  return world.history.resourceObligations.filter((obligation) => {
    if (!availableOn(obligation, obligation.establishedAt, cutoff))
      return false;
    const flow = world.history.resourceFlows.find(
      (record) => record.id === obligation.resourceFlowId,
    );
    return (
      flow !== undefined &&
      sameEndpoint(flow.source, positionOwnerEndpoint(owner)) &&
      resourceObligationStateAt(world, obligation.id, cutoff)?.status ===
        "active"
    );
  });
}

export function outstandingDebtAt(
  world: World,
  resourceObligationId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): MoneyAmount | null {
  const obligation = world.history.resourceObligations.find(
    (record) => record.id === resourceObligationId,
  );
  if (
    !obligation?.principal ||
    !availableOn(obligation, obligation.establishedAt, cutoff)
  ) {
    return null;
  }
  let paid = 0;
  for (const outcome of resourceTransferOutcomesForFlow(
    world,
    obligation.resourceFlowId,
    cutoff,
  )) {
    if (
      outcome.sequence <= obligation.sequence ||
      outcome.occurredAt < obligation.establishedAt
    ) {
      continue;
    }
    paid = addExact(paid, outcome.transferredAmount.minorUnits);
  }
  return money(
    Math.max(0, obligation.principal.minorUnits - paid),
    obligation.principal.currency,
  );
}

export type AffordabilityStatus = "available" | "strained" | "blocked";
export type AffordabilityReasonKey =
  `${"capacity" | "obligation" | "context"}:${string}`;

/**
 * A caller declares the one cadence bucket that makes its proposed expense
 * comparable with scheduled obligations. Cadence keys remain open taxonomy
 * values; this query deliberately treats only exact keys as comparable.
 */
export interface AffordabilityComparison {
  readonly cadenceKind: ResourceCadenceKind;
}

export interface ScheduledMajorObligationBucket {
  readonly cadenceKind: ResourceCadenceKind;
  readonly scheduledAmount: MoneyAmount;
  readonly obligationIds: readonly EntityId[];
  readonly termsIds: readonly EntityId[];
}

export interface AffordabilityAssessment {
  readonly status: AffordabilityStatus;
  readonly owner: ResourcePositionOwner;
  readonly cutoff: HistoricalCutoff;
  readonly proposedAmount: MoneyAmount;
  readonly comparison: AffordabilityComparison;
  readonly liquidPositionId: EntityId | null;
  readonly liquidBalance: MoneyAmount;
  /** Exact-cadence obligation evidence; amounts are never summed across rows. */
  readonly scheduledMajorObligationBuckets: readonly ScheduledMajorObligationBucket[];
  /** The only bucket used to derive this capacity status. */
  readonly comparableScheduledMajorObligations: MoneyAmount;
  readonly remainingAfterProposal: MoneyAmount;
  readonly reasonKeys: readonly AffordabilityReasonKey[];
  readonly evidenceRecordIds: readonly EntityId[];
}

export function assessAffordability(
  world: World,
  owner: ResourcePositionOwner,
  proposedAmount: MoneyAmount,
  comparison: AffordabilityComparison,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): AffordabilityAssessment {
  if (!isOpenTaxonomyKey(comparison.cadenceKind, RESOURCE_CADENCE_NAMESPACES)) {
    throw new Error(
      "Affordability comparison requires a valid resource cadence.",
    );
  }
  const position = resourcePositionAt(
    world,
    owner,
    proposedAmount.currency,
    cutoff,
  );
  const liquid = position?.liquidBalance.minorUnits ?? 0;
  const evidence = position ? [position.positionId] : [];
  const buckets = new Map<
    ResourceCadenceKind,
    {
      scheduled: number;
      obligationIds: EntityId[];
      termsIds: EntityId[];
    }
  >();
  for (const obligation of activeResourceObligationsForOwner(
    world,
    owner,
    cutoff,
  )) {
    const terms = resourceFlowTermsAt(world, obligation.resourceFlowId, cutoff);
    if (
      terms?.status === "active" &&
      terms.amount.currency === proposedAmount.currency
    ) {
      const bucket = buckets.get(terms.cadenceKind) ?? {
        scheduled: 0,
        obligationIds: [],
        termsIds: [],
      };
      bucket.scheduled = addExact(bucket.scheduled, terms.amount.minorUnits);
      bucket.obligationIds.push(obligation.id);
      bucket.termsIds.push(terms.id);
      buckets.set(terms.cadenceKind, bucket);
      evidence.push(obligation.id, terms.id);
    }
  }
  const scheduledMajorObligationBuckets = [...buckets.entries()].map(
    ([cadenceKind, bucket]) => ({
      cadenceKind,
      scheduledAmount: money(bucket.scheduled, proposedAmount.currency),
      obligationIds: [...bucket.obligationIds],
      termsIds: [...bucket.termsIds],
    }),
  );
  const comparableScheduled =
    buckets.get(comparison.cadenceKind)?.scheduled ?? 0;
  const remaining = Math.max(0, liquid - proposedAmount.minorUnits);
  let status: AffordabilityStatus;
  let reasonKeys: readonly AffordabilityReasonKey[];
  if (proposedAmount.minorUnits > liquid) {
    status = "blocked";
    reasonKeys = ["capacity:insufficient-liquid"];
  } else if (remaining < comparableScheduled) {
    status = "strained";
    reasonKeys = ["obligation:scheduled-commitments-constrain-capacity"];
  } else {
    status = "available";
    reasonKeys = ["capacity:liquid-after-obligations"];
  }
  return {
    status,
    owner: { ...owner },
    cutoff: { ...cutoff },
    proposedAmount: { ...proposedAmount },
    comparison: { ...comparison },
    liquidPositionId: position?.positionId ?? null,
    liquidBalance: money(liquid, proposedAmount.currency),
    scheduledMajorObligationBuckets,
    comparableScheduledMajorObligations: money(
      comparableScheduled,
      proposedAmount.currency,
    ),
    remainingAfterProposal: money(remaining, proposedAmount.currency),
    reasonKeys,
    evidenceRecordIds: [...new Set(evidence)],
  };
}

export function dwellingOccupancyStateHistory(
  world: World,
  dwellingOccupancyId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): readonly DwellingOccupancyStateRecord[] {
  return world.history.dwellingOccupancyStates.filter(
    (record) =>
      record.dwellingOccupancyId === dwellingOccupancyId &&
      available(record, cutoff),
  );
}

export function dwellingOccupancyStateAt(
  world: World,
  dwellingOccupancyId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): DwellingOccupancyStateRecord | undefined {
  return dwellingOccupancyStateHistory(world, dwellingOccupancyId, cutoff).at(
    -1,
  );
}

export function activeDwellingOccupanciesAt(
  world: World,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): readonly DwellingOccupancy[] {
  return world.history.dwellingOccupancies.filter(
    (record) =>
      availableOn(record, record.startedAt, cutoff) &&
      dwellingOccupancyStateAt(world, record.id, cutoff)?.status === "active",
  );
}

export function housingTenureStateHistory(
  world: World,
  housingTenureId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): readonly HousingTenureStateRecord[] {
  return world.history.housingTenureStates.filter(
    (record) =>
      record.housingTenureId === housingTenureId && available(record, cutoff),
  );
}

export function housingTenureStateAt(
  world: World,
  housingTenureId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): HousingTenureStateRecord | undefined {
  return housingTenureStateHistory(world, housingTenureId, cutoff).at(-1);
}

export function activeHousingTenuresAt(
  world: World,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
): readonly HousingTenure[] {
  return world.history.housingTenures.filter(
    (record) =>
      availableOn(record, record.startedAt, cutoff) &&
      housingTenureStateAt(world, record.id, cutoff)?.status === "active",
  );
}

export function sameEndpoint(
  left: ResourceEndpoint,
  right: ResourceEndpoint,
): boolean {
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case "person":
      return right.kind === "person" && left.personId === right.personId;
    case "household":
      return (
        right.kind === "household" && left.householdId === right.householdId
      );
    case "organization":
      return (
        right.kind === "organization" &&
        left.organizationId === right.organizationId
      );
  }
}

export function samePositionOwner(
  left: ResourcePositionOwner,
  right: ResourcePositionOwner,
): boolean {
  return sameEndpoint(
    positionOwnerEndpoint(left),
    positionOwnerEndpoint(right),
  );
}

export function positionOwnerEndpoint(
  owner: ResourcePositionOwner,
): ResourceEndpoint {
  switch (owner.kind) {
    case "person":
      return { kind: "person", personId: owner.personId };
    case "household":
      return { kind: "household", householdId: owner.householdId };
    case "organization":
      return { kind: "organization", organizationId: owner.organizationId };
  }
}

function available(
  record: { readonly effectiveAt: string; readonly sequence: number },
  cutoff: HistoricalCutoff,
): boolean {
  return availableOn(record, record.effectiveAt, cutoff);
}

function availableOn(
  record: { readonly sequence: number },
  date: string,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    date <= cutoff.asOfDate && record.sequence < cutoff.historySequenceExclusive
  );
}

function earlier<T extends string>(left: T, right: T): T {
  return left < right ? left : right;
}

function addExact(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new Error("Exact-money arithmetic exceeded the safe integer range.");
  }
  return result;
}

function money(minorUnits: number, currency: CurrencyCode): MoneyAmount {
  return { minorUnits, currency };
}
